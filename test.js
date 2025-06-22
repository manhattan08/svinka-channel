require('dotenv').config()
const axios = require('axios');

async function createLavaPaymentLink() {
    try{
        // const responseV2 = await axios.get('https://gate.lava.top/api/v2/products',{
        //     headers: {
        //         'X-Api-Key': `${process.env.LAVA_API_KEY}`,
        //         'Content-Type': 'application/json'
        //     }
        // });
        // console.log(responseV2.data.items[0].offers)
        const response = await axios.post('https://gate.lava.top/api/v2/invoice', {

            "email": "client@gmail.com",
            "offerId": process.env.LAVA_1_MONTH_OFFER_ID,
            "currency": "USD"

        }, {
            headers: {
                'X-Api-Key': `${process.env.LAVA_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        const {id, paymentUrl} = response.data;
    } catch (e) {
        console.log(e);
    }

    //
    // const responseV2 = await axios.get(`https://api.lava.top/api/v2/invoice/${orderId}`, {
    //     headers: {
    //         Authorization: `Bearer ${process.env.LAVA_API_KEY}`
    //     }
    // });
    //
    // console.log(responseV2.data);

}

createLavaPaymentLink()


