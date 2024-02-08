import axios, { AxiosResponse } from 'axios'

const gptAPI = 'http://g4f-api.k8s.maxwlang.com/v1/chat/completions'
const gptModel = 'gpt-4-turbo'
const gptTimeout = 6_000
const gptBlacklistedProviders = 'Phind' // comma delimited

;(async (): Promise<void> => {
    const prompt =
        (): string => `Generate text for a meme based on the name and description.
Meme Name: Why Cant I Hold All These Limes
Description: A man is holding a lot of limes and some are falling out of his hands. He looks confused and frustrated.

The generated meme text is to be returned as a JSON-Array of strings.

The generated text must be related to the meme name and description, it must follow the format of the examples, but it must not be identical to the examples.

Here is an example of a JSON-Array of strings:
["string 1", "string 2", "string 3"]

For context, here are examples of the meme text:
Example: ["Lime chaos:", "I can't keep up!"]
Example: ["Me trying to juggle", "all my responsibilities"]
Example: ["When life gives you limes", "but you can't hold them all"]
Example: ["Why cant I", "hold all these limes?"]

YOU MUST NOT RETURN THE EXAMPLES.
YOU MUST NOT RETURN THE NAME.
YOU MUST NOT INCLUDE THE NAME IN THE JSON-ARRAY.
YOU MUST NOT RETURN THE DESCRIPTION.
YOU MUST NOT INCLUDE THE DESCRIPTION IN THE JSON-ARRAY.

YOU MUST NOT RETURN ANYTHING ELSE. 
YOU MUST ONLY RETURN THE JSON-ARRAY OF STRINGS.`

    const the = await new Promise(async (resolve, reject) => {
        let val: AxiosResponse<unknown, unknown> | undefined | void = undefined

        while (val === undefined) {
            val = await axios
                .post(
                    gptAPI,
                    {
                        model: gptModel,
                        messages: [{ role: 'user', content: prompt() }]
                    },
                    {
                        timeout: gptTimeout
                    }
                )
                .catch(e => {
                    console.log('Request failed..')
                    switch (e.code) {
                        case 'ERR_BAD_RESPONSE':
                        case 'ECONNABORTED':
                        case 500:
                            return

                        default:
                            console.log(e)
                            reject(e)
                    }
                })

            if (
                gptBlacklistedProviders
                    .split(',')
                    .indexOf(
                        (val as { data: { provider: { name: string } } }).data
                            .provider.name
                    ) !== -1
            ) {
                val = undefined
            }
        }

        resolve(val)
    })

    console.log(the)
})()
