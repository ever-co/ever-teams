export const limitTextCharaters = ({ text, numChars }: { text: string, numChars: number }) => {
    if (!text) {
        return ""
    }

    if (text.length > numChars) {
        const textSub = text.substring(0, numChars);
        return textSub + "..."
    }

    return text
}