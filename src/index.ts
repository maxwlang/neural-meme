import {
    compositeText,
    createPayloadFromMemeObject,
    getGPTResponseForPayload,
    getRandomMeme,
    getRandomMemePath
} from './generation'
import fs from 'fs'
import axios from 'axios'
import FormData from 'form-data'
import { postInterval, webhookURL } from './config'
;(async (): Promise<void> => {
    console.log(`Starting`)

    async function post(): Promise<void> {
        console.log('Making meme')

        const memePath = await getRandomMemePath()
        const meme = await getRandomMeme(memePath)

        console.log(`Selected: ${meme.name}`)
        const GPTPayload = await createPayloadFromMemeObject(meme)
        console.log('Payload constructed')

        const gptResponse = await getGPTResponseForPayload(GPTPayload, meme)
        if (!gptResponse) throw new Error('Missing GPT response')

        const memeBuffer = await compositeText(memePath, gptResponse)
        console.log('Text composited')

        fs.writeFileSync('/tmp/generated.png', memeBuffer)
        console.log('File written')

        const data = new FormData()
        data.append('content', 'New New New!')
        data.append('files', fs.createReadStream('/tmp/generated.png'))
        data.append('username', 'NeuralMeme')

        const config = {
            method: 'post',
            maxBodyLength: Infinity,
            url: webhookURL,
            data
        }

        await axios.request(config).then(() => console.log('Posted to discord'))
    }

    await post()

    setInterval(post, postInterval)
})()
