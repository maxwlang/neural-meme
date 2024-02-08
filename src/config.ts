const validateParse = (envName: string): string => {
    const envValue = process.env[envName]
    if (!envValue) throw new Error(`Missing environment variable: ${envName}`)
    return envValue
}

export const gptAPI = validateParse('GPT_API') // 'http://g4f-api.k8s.maxwlang.com/v1/chat/completions'
export const gptTimeout = +validateParse('GPT_TIMEOUT') //6000
export const gptBlacklistedProviders = validateParse(
    'GPT_BLACKLISTED_PROVIDERS'
) //'Phind' // comma delimited
export const webhookURL = validateParse('WEBHOOK_URL')
export const postInterval = +validateParse('POST_INTERVAL') // 600_000
