import {
    createPayloadFromMemeObject,
    getGPTResponseForPayload,
    getRandomMeme,
    jcompositeText
} from './generation'
import fs from 'fs'
import axios from 'axios'
import FormData from 'form-data'
;(async (): Promise<void> => {
    console.log(`Running, webhook: ${process.env['WEBHOOK_URL']}`)

    async function post(): Promise<void> {
        console.log('Making meme')

        const meme = await getRandomMeme()
        const gptJPayload = await createPayloadFromMemeObject(meme)
        const gptJResponse = await getGPTResponseForPayload(gptJPayload)
        const memeBuffer = await jcompositeText(meme.image, gptJResponse)

        fs.writeFileSync('./generated.png', memeBuffer)
        const data = new FormData()
        data.append('content', 'New AI Funny')
        data.append('files', fs.createReadStream('./generated.png'))
        data.append('username', 'NeuralFunny')

        const config = {
            method: 'post',
            maxBodyLength: Infinity,
            url: process.env['WEBHOOK_URL'],
            data
        }

        await axios.request(config)
    }

    post()

    setInterval(post, 1000 * 60 * 10)
})()
