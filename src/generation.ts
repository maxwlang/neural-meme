import axios, { AxiosResponse } from 'axios'
import { glob } from 'glob'
import fs from 'fs'
import gm from 'gm'
import wordWrap from 'word-wrap'
import { gptAPI, gptBlacklistedProviders, gptModel, gptTimeout } from './config'
import { basename } from 'path'

export interface Meme {
    name: string
    description: string
    boxLocations: {
        x: number
        y: number
        font: {
            file: string
            size: number
            wrap: number
        }
        rotation?: number
        hidden: boolean
    }[]
    examples: string[][]
    exampleRequiredValues: number
}

export async function getRandomMemePath(): Promise<string> {
    const memes = await glob('./memes/*/')
    return memes[(memes.length * Math.random()) | 0]
}

export function getRandomMeme(memePath: string): Meme {
    const memeJson = fs.readFileSync(`${memePath}/meta.json`, 'utf-8')
    const memeObject: Meme = JSON.parse(memeJson)
    return memeObject
}

// ==========================================================================================================

export async function createPayloadFromMemeObject(
    memeObject: Meme
): Promise<GPTPayload> {
    const body = `Generate a JSON-ARRAY for a meme based on the name and description.
Meme Name: ${memeObject.name}
Description: ${memeObject.description}

The generated meme text is to be returned as a JSON-Array of strings.

The generated text must be related to the meme name and description, it must follow the format of the examples, but it must not be identical to the examples.

Here is an example of a JSON-Array of strings:
["string 1", "string 2", "string 3"]

For context, here are example JSON-ARRAYS for the meme:
${memeObject.examples
    .map(example => `Example: ${JSON.stringify(example)}`)
    .join('\n')}

YOU MUST NOT RETURN THE EXAMPLES.
YOU MUST NOT RETURN THE NAME.
YOU MUST NOT INCLUDE THE NAME IN THE JSON-ARRAY.
YOU MUST NOT RETURN THE DESCRIPTION.
YOU MUST NOT INCLUDE THE DESCRIPTION IN THE JSON-ARRAY.
YOU MUST NOT RETURN ANYTHING ELSE.

YOU MUST ONLY RETURN THE JSON-ARRAY OF STRINGS.
YOU MUST ONLY RETURN ONE JSON-ARRAY OF STRINGS.
THE GENERATED JSON-ARRAY OF STRINGS MUST HAVE THE SAME AMOUNT OF VALUES AS THE EXAMPLES.
FAILING TO FOLLOW THESE INSTRUCTIONS WILL SUBTRACT $200.`

    return {
        model: gptModel,
        messages: [{ role: 'user', content: body }]
    }
}

// ==========================================================================================================

export interface GPTPayload {
    model: string
    messages: {
        role: string
        content: string
    }[]
}

export interface GPTResponse {
    boxes: {
        boxLocation: Meme['boxLocations'][0]
        boxText: string
    }[]
}

export async function getGPTResponseForPayload(
    payload: GPTPayload,
    meme: Meme
): Promise<GPTResponse> {
    let parsed: string[] = []
    let val: AxiosResponse | undefined | void = undefined

    while (val === undefined) {
        val = await axios
            .post(gptAPI, payload, {
                timeout: gptTimeout
            })
            .catch(e => {
                console.log('Request failed..')
                switch (e.code) {
                    case 'ERR_BAD_RESPONSE':
                    case 'ECONNABORTED':
                    case 500:
                        console.log('Retrying..')
                        return

                    default:
                        console.log('Fatal')
                        console.log(e)
                        throw e
                }
            })

        if (val === undefined) continue

        if (
            gptBlacklistedProviders
                .split(',')
                .indexOf(val.data.provider.name) !== -1
        ) {
            val = undefined
            continue
        }

        try {
            const arraySearch = /\["(.*?)"\]/
            const match = (
                val as AxiosResponse
            ).data.choices[0].message.content.match(arraySearch)

            parsed = JSON.parse(match[0])
        } catch (_e) {
            console.log('Failed to parse response..')
            console.log(val.data.choices[0].message.content)
            val = undefined
            continue
        }

        if (parsed.length < meme.exampleRequiredValues) {
            console.log('Invalid response length: too small')
            console.log(parsed, parsed.length, meme.exampleRequiredValues)
            val = undefined
            continue
        }

        if (parsed.length > meme.exampleRequiredValues) {
            console.log('Invalid response length: too big')
            console.log("We'll work with it..")
            console.log(parsed, parsed.length, meme.exampleRequiredValues)
            parsed = parsed.slice(0, meme.exampleRequiredValues)
            continue
        }
    }

    const boxes: GPTResponse['boxes'] = parsed.map(
        (memeText: string, i: number) => ({
            boxLocation: meme.boxLocations[i],
            boxText: memeText
        })
    )

    return {
        boxes
    }
}

// ==========================================================================================================

export async function compositeText(
    memePath: string,
    gptResponse: GPTResponse
): Promise<Buffer> {
    const memeImagePath = await glob(`${memePath}/image.{jpg,jpeg,png}`)
    const gmagick = gm(memeImagePath[0])
        .fill('#fff')
        .stroke('#000')
        .strokeWidth(2)

    for (const box of gptResponse.boxes) {
        if (box.boxLocation.hidden) continue

        const wrappedText = wordWrap(box.boxText, {
            width: box.boxLocation.font.wrap
        })

        gmagick.font(
            `./fonts/${basename(box.boxLocation.font.file)}`,
            box.boxLocation.font.size
        )

        if (box.boxLocation.rotation) {
            gmagick.rotate('#000', box.boxLocation.rotation)
        }

        gmagick.drawText(
            box.boxLocation.x,
            box.boxLocation.y,
            wrappedText,
            'NorthWest'
        )

        if (box.boxLocation.rotation) {
            gmagick.rotate('#000', -box.boxLocation.rotation)
        }
    }

    const buffer = await new Promise<Buffer>((res, rej) => {
        gmagick.toBuffer((err, buff) => {
            if (err) rej(err)
            res(buff)
        })
    })

    return buffer
}

// ==========================================================================================================
