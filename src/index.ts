import {
    createPayloadFromMemeObject,
    getGPTResponseForPayload,
    getRandomMeme,
    jcompositeText
} from './generation'
import fs from 'fs'
import cron from 'node-cron'
;(async (): Promise<void> => {
    const meme = await getRandomMeme()
    const gptJPayload = await createPayloadFromMemeObject(meme)
    const gptJResponse = await getGPTResponseForPayload(gptJPayload)
    const memeBuffer = await jcompositeText(meme.image, gptJResponse)

    fs.writeFileSync('./test.png', memeBuffer)

    cron.schedule('* * * * *', () => {
        console.log('running a task every minute')
    })
})()
