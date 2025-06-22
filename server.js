require('dotenv').config()
const express = require('express')
const {Bot, webhookCallback, InlineKeyboard} = require('grammy')
const cors = require('cors')
const { createClient } = require('@supabase/supabase-js')
const cron = require('node-cron')

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
)

const app = express()
const PORT = process.env.PORT || 3000
const bot = new Bot(process.env.BOT_TOKEN)

app.use(cors())
app.use(express.json())

const secretPath = `/bot${process.env.BOT_TOKEN}`
app.use(secretPath, webhookCallback(bot, 'express'))

app.post('/webhook', async (req, res) => {
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

    return res.status(200).json({success:true});
})

app.get('/', (req, res) => {
    res.status(200).json({ message: 'ALL RIGHT' });
});

cron.schedule('0 0 * * *', async () => {
    try {
        const now = new Date().toISOString()
        const { data: expired, error } = await supabase
            .from('subscriptions')
            .select('telegram_id')
            .lt('expire_date', now)

        if (error) {
            console.error('Error fetching expired subscriptions:', error)
            return
        }

        for (const { telegram_id } of expired) {
            try {
                await bot.api.sendMessage(
                    telegram_id,
                    'Ваша подписка закончилась',
                    {
                        reply_markup: new InlineKeyboard()
                            .text('📝 Оформить подписку', 'subscribe')
                    }
                )

                await bot.api.banChatMember(process.env.PRIVATE_CHANNEL_ID, telegram_id)
                await bot.api.unbanChatMember(process.env.PRIVATE_CHANNEL_ID, telegram_id)

                await supabase
                    .from('subscriptions')
                    .delete()
                    .eq('telegram_id', telegram_id)
            } catch (kickError) {
                console.error(`Error processing expired user ${telegram_id}:`, kickError)
            }
        }
    } catch (err) {
        console.error('Cron job failed:', err)
    }
})

app.listen(PORT, async () => {
    const webhookUrl = `${process.env.SERVER_URL}${secretPath}`
    await bot.api.setWebhook(webhookUrl)
    console.log(`Server + bot запущены на порту ${PORT}`)
})

module.exports = {
    supabase
}