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
    process.env['WEBHOOK_URL'] =
        'https://discord.com/api/webhooks/1097421805377044480/8fWIZZpQROLprNjyRIMM5zb04Wev_ooqaPLMbNJ_wfDRYXbK8nSnriDGx3iTFSHI8mmN'
    console.log(`Running, webhook: ${process.env['WEBHOOK_URL']}`)

    async function post(): Promise<void> {
        console.log('Making meme')

        const meme = await getRandomMeme()
        console.log(`Selected: ${meme.name}`)
        const gptJPayload = await createPayloadFromMemeObject(meme)
        console.log('Payload constructed')

        let satisfactoryText = false
        let gptJResponse
        while (!satisfactoryText) {
            gptJResponse = await getGPTResponseForPayload(gptJPayload)
            console.log('GPT response obtained')

            const { boxes } = gptJResponse
            for (let i = 0; i < boxes.length - 1; i++) {
                const box = boxes[i]
                const { examples } = meme

                if (
                    examples.find((example: string[]) =>
                        example.find(
                            boxText => boxText.toLowerCase() === box.boxText
                        )
                    )
                ) {
                    break
                } else {
                    satisfactoryText = true
                }
            }
        }
        const memeBuffer = await jcompositeText(meme.image, gptJResponse)
        console.log('Text composited')

        fs.writeFileSync('./generated.png', memeBuffer)
        console.log('File written')

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

        await axios.request(config).then(() => console.log('Posted to discord'))
    }

    post()

    setInterval(post, 1000 * 60 * 10)
})()
