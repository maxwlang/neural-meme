import axios from 'axios'
import { isEmpty, isNil } from 'ramda'
import { basename } from 'path'
import { glob } from 'glob'
import fs from 'fs'
import jimp from 'jimp'

export interface Meme {
    name: string
    font: string
    description: string
    image: string
    gptJ: {
        generatedTokenLimit: number
        topP: number
        topK: number
        temperature: number
    }
    boxLocations: {
        x: number
        y: number
    }[]
    examples: string[][]
}

export async function getRandomMeme(): Promise<Meme> {
    const memes = await glob('./memes/*.json')
    const meme = memes[(memes.length * Math.random()) | 0]
    const memeJson = fs.readFileSync(meme, 'utf-8')
    const memeObject: Meme = JSON.parse(memeJson)
    return memeObject
}

// ==========================================================================================================

export async function createPayloadFromMemeObject(
    memeObject: Meme
): Promise<GPTJPayload> {
    const header = `Meme Name: ${memeObject.name}\nAlternate names: ${memeObject.description}`

    let examples = ''
    for (const example of memeObject.examples) {
        const exampleString = example
            .map((v, i) => `Box ${i + 1}: ${v}`)
            .join('\n')
        examples += `\n###\n${exampleString}`
    }

    const { gptJ } = memeObject
    const body = `${header}${examples}\n###\nBox 1:`
    const hashCount = body.split('###').length - 1 // Subtract one because of the final ###

    return {
        text: body,
        generate_tokens_limit: gptJ.generatedTokenLimit,
        temperature: gptJ.temperature,
        top_k: gptJ.topK,
        top_p: gptJ.topP,
        hashCount,
        boxLocations: memeObject.boxLocations
    }
}

// ==========================================================================================================

export interface GPTJPayload {
    text: string
    generate_tokens_limit: number
    top_p: number
    top_k: number
    temperature: number
    hashCount: number
    boxLocations: {
        x: number
        y: number
    }[]
}

export interface GPTJResponse {
    boxes: {
        boxLocation: {
            x: number
            y: number
            font: string
        }
        boxText: string
    }[]
}

export async function getGPTResponseForPayload(
    payload: GPTJPayload
): Promise<GPTJResponse> {
    const gptJResponse = await axios.post(
        'http://10.0.2.135:8080/generate',
        payload
    )
    console.log(gptJResponse.status)

    if (gptJResponse.status !== 200) {
        throw new Error('Request failed with non-200 status code')
    }

    if (
        isNil(gptJResponse.data) ||
        isEmpty(gptJResponse.data) ||
        isNil(gptJResponse.data.completion) ||
        isEmpty(gptJResponse.data.completion)
    ) {
        throw new Error('GPTJ response was empty')
    }

    const memeArray = gptJResponse.data.completion.split('###')
    console.log(memeArray)

    const boxRegex = /(Box [0-9]:[\s]?)/gi
    const boxes = memeArray[payload.hashCount]
        .replaceAll(boxRegex, '')
        .split('\n')
        .slice(1, -1)
        .map((memeText: GPTJResponse['boxes'], i: number) => ({
            boxLocation: payload.boxLocations[i],
            boxText: memeText
        }))

    return {
        boxes
    }
}

// ==========================================================================================================

export async function jcompositeText(
    imagePath: string,
    gptJResponse: GPTJResponse
): Promise<Buffer> {
    const image = await jimp.read(`./images/${basename(imagePath)}`)

    for (const box of gptJResponse.boxes) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const impactFont = await jimp.loadFont(jimp[`${box.boxLocation.font}`])
        image.print(impactFont, box.boxLocation.x, box.boxLocation.y, {
            text: box.boxText,
            alignmentX: jimp.HORIZONTAL_ALIGN_LEFT
        })
    }
    return await image.getBufferAsync('image/png')
}

// ==========================================================================================================
