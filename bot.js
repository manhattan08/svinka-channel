require('dotenv').config()
const {Bot, InlineKeyboard} = require('grammy')
const {conversations, createConversation} = require("@grammyjs/conversations");
const {TronWeb} = require('tronweb');
const {post} = require("axios");
const supabase = require("./supabase");

const tronWeb = new TronWeb({fullHost: 'https://api.trongrid.io'});
const INVITE_REVOKE_SECONDS = Math.max(5, Number(60));

const bot = new Bot(process.env.BOT_TOKEN)

bot.use(conversations());
bot.use(createConversation(handleTxid));
bot.use(createConversation(collectEmail));

bot.command('start', async (ctx) => {
    const startText = `👋 Бот позволяет произвести платёжную операцию для подписки и *ознакомиться с начальной информацией* о канале

💵 Стоимость подписки — *${process.env.PRICE_1_MONTH}$*
Оплата принимается *криптовалютой* и *банковской картой*`

    const keyboard = new InlineKeyboard()
        .text('📝 Оформить подписку', 'subscribe')
        .row()
        .text('📖 Подробности о канале', 'about')
        .row()
        .text('📄 Оферта', 'offer')
        .row()
        .url('🛠 Поддержка', 'https://t.me/pipkasiska228')

    await ctx.reply(startText, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
    })
})

bot.callbackQuery('about', async (ctx) => {
    const aboutText = `Привет. Я — автор канала *nesvinkaslav*, а это — *«Мнемониум»* — мой *личный дневник* знаний, полученных через переживания, наблюдения, вечно бьющую мозг теорию и обузданную практику.
  
Негативные обстоятельства, жизненные трудности, внутреннее любопытство — всё это стало источником вдохновения.

Буду честен: этот канал не обещает *успешного успеха*, не сделает вас богатым, сильным или просветлённым.

Я не открою вам секретов, не скажу, что книги делают умнее — напротив, скорее опровергну это. Возможно, в вашей жизни ничего *не изменится*.
А возможно, одно видео или текст окажется тем самым последним пазлом, который *подтолкнёт* вас к *давно обдумываемому* решению.

Развитие зависит не от *чужих* советов, а от *ваших* намерений и подхода.
Чужой опыт — не карта, по которой можно провести другого человека, но даже фильтруя информацию, вы продвигаетесь вперёд.
Потому что *анализируете*, а не просто слушаете.

Я не считаю себя великим мудрецом.
Но вижу, как люди задают мне одни и те же вопросы в комментариях или личку менеджера — от бытовых до философских/научных.
А в рамках тиктока, с его хронометражем и удержанием внимания, невозможно раскрыть всё как следует.
Так почему бы не сделать это *здесь* — в пространстве, где действительно интересно наблюдать за творчеством автора.

Некоторые даже заказывали *платные звонки* со мной — эта функция будет доступна и *здесь*.

Также:

Будут *прямые трансляции*, где каждый участник сможет задать один вопрос, и мы попробуем найти на него ответ вместе.
*Длинные видеоролики* с глубоким разбором тем — как лично мной поднятых, так и предложенных вами в комментариях.
Канал будет постепенно *наполняться*: где-то это будет текст, где-то видео, где-то личные моменты.

🧠 *Подумайте внимательно*, прежде чем оформить подписку.`

    const keyboard = new InlineKeyboard().text('📝 Оформить подписку', 'subscribe')

    await ctx.reply(aboutText, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
    })
});

bot.callbackQuery('offer', async (ctx) => {
    await ctx.reply(
        '*Публичная оферта о предоставлении доступа к Telegram\\-каналу*\n' +
        'Настоящая Оферта является официальным предложением физического лица \\(далее — *Исполнитель*\\) любому лицу \\(далее — *Покупатель*\\) заключить договор на указанных ниже условиях\\.\n\n' +

        '*1\\. Предмет оферты*\n' +
        '1\\.1\\. Исполнитель предоставляет Покупателю доступ к закрытому Telegram\\-каналу после получения оплаты\\.\n' +
        '1\\.2\\. Доступ предоставляется в течение 24 часов после подтверждения успешной оплаты \\(обычно — автоматически в течение нескольких минут\\)\\.\n\n' +

        '*2\\. Условия подписки*\n' +
        '2\\.1\\. Подписка оформляется на один из следующих сроков:\n' +
        '_1 месяц_\n' +
        '_3 месяца_\n' +
        '2\\.2\\. Ссылка на канал или инструкция по подключению отправляется через Telegram после успешной оплаты\\.\n' +
        '2\\.3\\. Доступ предоставляется на Telegram\\-аккаунт, с которого была совершена оплата \\(если не указано иное\\)\\.\n\n' +

        '*3\\. Оплата*\n' +
        '3\\.1\\. Оплата производится через сервис *Lava* с использованием банковской карты, криптовалюты или других доступных способов\\.\n' +
        '3\\.2\\. Все платежи являются окончательными\\. Возврат средств возможен только в случае технической ошибки со стороны Исполнителя \\(например, доступ не был выдан в течение 48 часов\\)\\.\n\n' +

        '*4\\. Отказ от ответственности*\n' +
        '4\\.1\\. Исполнитель не несёт ответственности за сбои в работе Telegram или недоступность сервиса, вызванную действиями третьих лиц\\.\n' +
        '4\\.2\\. Покупатель обязуется не передавать доступ к каналу третьим лицам\\. В случае нарушения — доступ может быть приостановлен без компенсации\\.\n\n' +

        '*5\\. Заключительные положения*\n' +
        '5\\.1\\. Принятие условий оферты \\(оплата\\) означает полное согласие Покупателя с настоящим договором\\.\n' +
        '5\\.2\\. Оферта действует бессрочно, пока не будет отозвана Исполнителем\\.',
        {parse_mode: "MarkdownV2"}
    );
})

bot.callbackQuery('subscribe', async (ctx) => {
    await ctx.reply(`📦 Подписка может быть оформлена на:

1 месяц — *${process.env.PRICE_1_MONTH}$*
3 месяца — *${process.env.PRICE_3_MONTH}$*
6 месяцев - *50$*
Навсегда - *150$*

Вся валюта автоматически *конвертируется*`, {
        parse_mode: 'Markdown',
        reply_markup:  new InlineKeyboard()
            .text('💸 Криптовалюта (TRC-20)', 'pay_trc')
            .row()
            .url(
                '💳 Банковская карта',
                'https://t.me/tribute/app?startapp=sHgt'
            )
            .row()
            .text('💳 Банковская карта «МИР»', 'pay_card_mir')
    })
})

bot.callbackQuery('pay_trc', async (ctx) => {
    await ctx.reply(
        `Ты выбрал оплату в USDT (TRC-20).

Теперь выбери срок подписки:`,
        {
            reply_markup: new InlineKeyboard()
                .text('1 месяц', 'plan_1_trc')
                .row()
                .text('3 месяца', 'plan_3_trc')
                .row()
                .text('6 месяцев', 'plan_6_trc')
                .row()
                .text('Навсегда', 'plan_infinity_trc')
        }
    );
});

bot.callbackQuery('pay_card_mir', async (ctx) => {
    await ctx.reply(
        `Ты выбрал оплату банковской картой «МИР».

Теперь выбери срок подписки:`,
        {
            reply_markup: new InlineKeyboard()
                .text('1 месяц', 'plan_1_card_mir')
                .row()
                .text('3 месяца', 'plan_3_card_mir')
                .row()
                .text('6 месяцев', 'plan_6_card_mir')
                .row()
                .text('Навсегда', 'plan_infinity_card_mir')
        }
    );
});


bot.callbackQuery('plan_1_trc', async (ctx) => {
    await ctx.reply(`📌 Отправь *${process.env.PRICE_1_MONTH} USDT* в сети *TRC-20* (блокчейн *TRON*) по следующему номеру кошелька:\n\n\`${process.env.CRYPTO_WALLET}\`\n
Можно просто кликнуть на номер и он скопируется, далее:\n\n1️⃣ Обязательно проверь, что выбрал *TRC-20*\n2️⃣ Обязательно проверь номер кошелька\n\nКак только оплата будет произведена, нажми "✅ *Я оплатил*"`, {
        parse_mode: 'Markdown',
        reply_markup: new InlineKeyboard().text('✅ Я оплатил', 'check_1m')
    })
})

bot.callbackQuery('plan_3_trc', async (ctx) => {
    await ctx.reply(`📌 Отправь *${process.env.PRICE_3_MONTH} USDT* в сети *TRC-20* (блокчейн *TRON*) по следующему номеру кошелька:\n\n\`${process.env.CRYPTO_WALLET}\`\n
Можно просто кликнуть на номер и он скопируется, далее:\n\n1️⃣ Обязательно проверь, что выбрал *TRC-20*\n2️⃣ Обязательно проверь номер кошелька\n\nКак только оплата будет произведена, нажми "✅ *Я оплатил*"`, {
        parse_mode: 'Markdown',
        reply_markup: new InlineKeyboard().text('✅ Я оплатил', 'check_3m')
    })
})

bot.callbackQuery('plan_6_trc', async (ctx) => {
    await ctx.reply(`📌 Отправь *50 USDT* в сети *TRC-20* (блокчейн *TRON*) по следующему номеру кошелька:\n\n\`${process.env.CRYPTO_WALLET}\`\n
Можно просто кликнуть на номер и он скопируется, далее:\n\n1️⃣ Обязательно проверь, что выбрал *TRC-20*\n2️⃣ Обязательно проверь номер кошелька\n\nКак только оплата будет произведена, нажми "✅ *Я оплатил*"`, {
        parse_mode: 'Markdown',
        reply_markup: new InlineKeyboard().text('✅ Я оплатил', 'check_6m')
    })
})

bot.callbackQuery('plan_infinity_trc', async (ctx) => {
    await ctx.reply(`📌 Отправь *150 USDT* в сети *TRC-20* (блокчейн *TRON*) по следующему номеру кошелька:\n\n\`${process.env.CRYPTO_WALLET}\`\n
Можно просто кликнуть на номер и он скопируется, далее:\n\n1️⃣ Обязательно проверь, что выбрал *TRC-20*\n2️⃣ Обязательно проверь номер кошелька\n\nКак только оплата будет произведена, нажми "✅ *Я оплатил*"`, {
        parse_mode: 'Markdown',
        reply_markup: new InlineKeyboard().text('✅ Я оплатил', 'check_infinity')
    })
})

bot.callbackQuery('plan_1_card_mir', async (ctx) => {
    await ctx.conversation.enter('collectEmail', {
        months: 1,
        offerId: process.env.LAVA_1_MONTH_OFFER_ID,
        currency: 'RUB',
        paymentMethod: 'BANK131'
    });
});

bot.callbackQuery('plan_3_card_mir', async (ctx) => {
    await ctx.conversation.enter('collectEmail', {
        months: 3,
        offerId: process.env.LAVA_3_MONTH_OFFER_ID,
        currency: 'RUB',
        paymentMethod: 'BANK131'
    });
});

bot.callbackQuery('plan_6_card_mir', async (ctx) => {
    await ctx.conversation.enter('collectEmail', {
        months: 6,
        offerId: 'dd0055da-0019-477e-ba94-722eed852c76',
        currency: 'RUB',
        paymentMethod: 'BANK131'
    });
});

bot.callbackQuery('plan_infinity_card_mir', async (ctx) => {
    await ctx.conversation.enter('collectEmail', {
        months: 999,
        offerId: 'ff6ec5df-9fdf-4ec7-857f-fb7de4448df0',
        currency: 'RUB',
        paymentMethod: 'BANK131'
    });
});

bot.callbackQuery('check_1m', async (ctx) => {
    await ctx.conversation.enter('handleTxid', ctx);
});

bot.callbackQuery('check_3m', async (ctx) => {
    await ctx.conversation.enter('handleTxid', ctx);
});

bot.callbackQuery('check_6m', async (ctx) => {
    await ctx.conversation.enter('handleTxid', ctx);
});

bot.callbackQuery('check_infinity', async (ctx) => {
    await ctx.conversation.enter('handleTxid', ctx);
});

async function handleTxid(conversation, ctx, tariff) {
    await ctx.reply(
        '💬 Введи TXID (хеш транзакции), которую только что отправил.\n\n' +
        'Когда вы оплатили, вы можете зайти в свою транзакцию в криптокошельке (например, TronLink или Trust Wallet, Binance), ' +
        'открыть её и увидеть там *TXID* — это уникальный идентификатор (хеш) вашей транзакции. ' +
        'Именно его нужно отправить сюда.',{parse_mode: 'Markdown'}
    );

    const {message} = await conversation.waitFor('message:text');
    const txid = message.text.trim();

    await ctx.reply('⏳ Проверяю транзакцию...');

    const { data: existed} = await supabase
        .from('expired_txid')
        .select('txid')
        .eq('txid', txid)
        .single()

    if (existed) {
        await ctx.reply('❌ Этот TXID уже был использован ранее. Если вы оплатили один раз — не нужно нажимать повторно.');
        return;
    }

    const keyboard = new InlineKeyboard().text('✅ Я оплатил', tariff.match);

    try {
        const txInfo = await tronWeb.trx.getTransaction(txid);

        if (!txInfo || !txInfo.raw_data) {
            await ctx.reply('❌ Транзакция не найдена. Убедись, что TXID верный.', {
                parse_mode: 'Markdown',
                reply_markup: keyboard
            });
            return;
        }

        if (txInfo.ret[0].contractRet !== 'SUCCESS') {
            await ctx.reply('❌ Транзакция не выполнена успешно. Подождите подтверждения в сети и попробуйте снова нажав на кнопку `✅ Я оплатил`.', {
                parse_mode: 'Markdown',
                reply_markup: keyboard
            });
            return;
        }

        const contract = txInfo.raw_data.contract[0];
        let amount;
        let recipientMatches = false;

        let cost;
        switch (tariff.match) {
            case 'check_1m':
                cost = Number(process.env.PRICE_1_MONTH);
                break;

            case 'check_3m':
                cost = Number(process.env.PRICE_3_MONTH);
                break;

            case 'check_6m':
                cost = Number(50);
                break;

            case 'check_infinity':
                cost = Number(150);
                break;

            default:
                cost = 0;
        }

        if (contract.type === 'TriggerSmartContract') {
            const {data} = contract.parameter.value;

            if (data.slice(0, 8) !== 'a9059cbb') {
                await ctx.reply('❌ Это не вызов transfer у TRC-20 токена.');
                return;
            }

            const param1 = data.slice(8, 8 + 64);
            const toHexAddr = param1.slice(22);
            const toAddress = tronWeb.address.fromHex(toHexAddr);

            const rawAmount = BigInt('0x' + data.slice(8 + 64));
            const decimals = 6;
            amount = Number(rawAmount) / 10 ** decimals;

            recipientMatches = toAddress === process.env.CRYPTO_WALLET;
        }

        if (contract.type === 'TriggerSmartContract') {
            const { data } = contract.parameter.value;

            if (data.slice(0, 8) !== 'a9059cbb') {
                await ctx.reply('❌ Это не вызов transfer у TRC-20 токена.');
                return;
            }

            const param1 = data.slice(8, 8 + 64);
            const addr20 = param1.slice(24);
            const toHexAddr = '41' + addr20;
            const toAddressB58 = tronWeb.address.fromHex(toHexAddr);

            const amountHex = data.slice(8 + 64, 8 + 64 + 64);
            const rawAmount = BigInt('0x' + amountHex);
            amount = Number(rawAmount) / 1e6;

            recipientMatches = toAddressB58 === 'TGLJgj1ahHWkL6rSh12EXCg3uWdfGmpcPV' || toAddressB58 === process.env.CRYPTO_WALLET;
        } else if (contract.type === 'TransferContract') {
            const {to_address, amount: raw} = contract.parameter.value;
            const toAddress = tronWeb.address.fromHex(to_address);
            amount = (raw / 1e6) / 3.8;
            recipientMatches = toAddress === process.env.CRYPTO_WALLET;
        } else {
            await ctx.reply('❌ Этот тип транзакции не поддерживается.');
            return;
        }

        if (recipientMatches && amount >= cost) {
            const invite = await bot.api.createChatInviteLink(process.env.PRIVATE_CHANNEL_ID, {
                member_limit: 1,
                creates_join_request: false,
                expire_date: Math.floor(Date.now() / 1000) + INVITE_REVOKE_SECONDS
            });

            await ctx.reply(
                `✅ Оплата подтверждена! Вот твоя *одноразовая ссылка*:\n\n${invite.invite_link}`,{parse_mode:'Markdown'}
            );

            const monthsMap = {
                check_1m: 1,
                check_3m: 3,
                check_6m: 6,
                check_infinity: 999
            };

            const months = monthsMap[tariff.match];
            const expireDate = new Date();
            expireDate.setMonth(expireDate.getMonth() + months);
            const expireValue = expireDate.toISOString();

            await supabase
                .from('subscriptions')
                .insert([{
                    telegram_id: ctx.from.id,
                    status: 'paid',
                    username: ctx.from.username ?? null,
                    invite_link: invite.invite_link,
                    expire_date: expireValue
                }]);

            await supabase
                .from('expired_txid')
                .insert([{txid}])

            setTimeout(async () => {
                try {
                    await bot.api.revokeChatInviteLink(
                        process.env.PRIVATE_CHANNEL_ID,
                        invite.invite_link
                    )
                } catch (err) {
                    console.error('Revoke failed:', err)
                }
            }, INVITE_REVOKE_SECONDS * 1000)
        } else {
            await ctx.reply(
                `❌ Транзакция не соответствует условиям: проверь адрес получателя и что сумма ≥ ${cost}.`, {
                    parse_mode: 'Markdown',
                    reply_markup: keyboard
                }
            );
        }
    } catch (error) {
        await ctx.reply('❌ Ошибка при проверке транзакции. Попробуй позже.', {
            parse_mode: 'Markdown',
            reply_markup: keyboard
        });
    }
}

async function collectEmail(conversation, ctx, opts) {
    await ctx.reply('✉️ Введите ваш e-mail (мы укажем его в счёте и отправим туда квитанцию об оплате):');

    const { message } = await conversation.waitFor('message:text');
    const email = (message.text || '').trim();

    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!emailOk) {
        await ctx.reply('❌ Похоже, это не e-mail. Попробуйте ещё раз, выбрав способ оплаты заново.');
        return;
    }

    try {
        await ctx.reply('⏳ Генерируем ссылку для оплаты...');

        const response = await post(
            'https://gate.lava.top/api/v2/invoice',
            {
                email,
                offerId: opts.offerId,
                currency: opts.currency,
                paymentMethod: opts?.paymentMethod
            },
            {
                headers: {
                    'X-Api-Key': process.env.LAVA_API_KEY,
                    'Content-Type': 'application/json',
                },
            }
        );

        const { paymentUrl, id: paymentId } = response.data;

        await ctx.reply(
            'Нажмите, чтобы оплатить (как только транзакция будет успешной, я пришлю ссылку на канал):',
            { reply_markup: new InlineKeyboard().webApp('💳 Оплатить сейчас', { url: paymentUrl }) }
        );

        const expireDate = new Date();
        expireDate.setMonth(expireDate.getMonth() + Number(opts.months || 1));

        await supabase
            .from('subscriptions')
            .insert([{
                telegram_id: ctx.from.id,
                username: ctx.from.username ?? null,
                expire_date: expireDate.toISOString(),
                payment_id: paymentId
            }]);

    } catch (err) {
        console.log(err);
        await ctx.reply('❌ Не удалось создать счёт. Попробуйте ещё раз позже.');
    }
}


module.exports = bot;