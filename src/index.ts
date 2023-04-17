import {
    createPayloadFromMemeObject,
    getGPTResponseForPayload,
    getRandomMeme,
    jcompositeText
} from './generation'
import fs from 'fs'
import axios from 'axios'
import FormData from 'form-data'
import cron from 'node-cron'
;(async (): Promise<void> => {
    cron.schedule('* * * * 10', async () => {
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
            url: 'https://discord.com/api/webhooks/1097411076037029928/sy2DYOC2IfDR5AzN1a2e9GPUPba-MFsWaNliokmcmtg6YLVLOHxb9O31S-TfNtStQ98_',
            data
        }

        await axios.request(config)
    })
})()
