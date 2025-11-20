require('dotenv').config()
const express = require('express')
const { webhookCallback, InlineKeyboard} = require('grammy')
const cors = require('cors')
const cron = require('node-cron')
const bot = require("./bot");
const supabase = require("./supabase");

const app = express()
const PORT = process.env.PORT || 3000

app.use(cors())
app.use(express.json())

const secretPath = `/bot${process.env.BOT_TOKEN}`
app.use(secretPath, webhookCallback(bot, 'express'))

app.post('/webhook', async (req, res) => {
    try{
        const {eventType, contractId} = req.body;

        if(eventType !== 'payment.success') return res.status(200).json({success:false});

        const { data: subscription, error } = await supabase
            .from('subscriptions')
            .select('telegram_id')
            .eq('payment_id', contractId)
            .single()

        if (error || !subscription) {
            console.error('Subscription not found or Supabase error:', error)
            return res.status(404).json({ success: false, error: 'Subscription not found' })
        }

        const invite = await bot.api.createChatInviteLink(process.env.PRIVATE_CHANNEL_ID, {
            member_limit: 1,
            creates_join_request: false,
        })

        await bot.api.sendMessage(
            subscription.telegram_id,
            `✅ Оплата подтверждена! Вот твоя *одноразовая ссылка*:\n\n ${invite.invite_link}`,{parse_mode:'Markdown'}
        )

        await supabase
            .from('subscriptions')
            .update({ status: 'paid', invite_link:invite.invite_link})
            .eq('payment_id', contractId)

        return res.status(200).json({success:true});
    } catch (e) {
        console.log(e)
        return res.status(500).json({success:false});
    }
})

app.get('/ping', (req, res) => {
    res.status(200).json({ message: 'pong' });
});

cron.schedule('0 */12 * * *', async () => {
    try {
        const now = new Date().toISOString();
        const { data: expired, error } = await supabase
            .from('subscriptions')
            .select('id, telegram_id, status')
            .lt('expire_date', now);

        if (error) {
            console.error('Error fetching expired subscriptions:', error);
            return;
        }
        if (!expired || expired.length === 0) return;

        const paidExpired = expired.filter(r => r.status === 'paid');
        const toPurgeIds  = expired.filter(r => r.status !== 'paid').map(r => r.id);

        if (toPurgeIds.length) {
             await supabase
                .from('subscriptions')
                .delete()
                .in('id', toPurgeIds);
        }

        for (const { telegram_id, id } of paidExpired) {
            try {
                try {
                    await bot.api.sendMessage(
                        telegram_id,
                        'Ваша подписка закончилась',
                        {
                            reply_markup: new InlineKeyboard()
                                .text('📝 Оформить подписку', 'subscribe'),
                        }
                    );
                } catch (e){}

                await bot.api.banChatMember(process.env.PRIVATE_CHANNEL_ID, telegram_id)
                await bot.api.unbanChatMember(process.env.PRIVATE_CHANNEL_ID, telegram_id)

                await supabase
                    .from('subscriptions')
                    .delete()
                    .eq('id', id);
            } catch (kickError) {
                console.error(`Error processing expired paid user ${telegram_id}:`, kickError);
            }
        }

        console.log('Kicked users - ' + paidExpired.length);
    } catch (err) {
        console.error('Cron job failed:', err);
    }
});

app.listen(PORT, async () => {
    const webhookUrl = `${process.env.SERVER_URL}${secretPath}`
    await bot.api.setWebhook(webhookUrl)
    console.log(`Server + bot запущены на порту ${PORT}`)
})