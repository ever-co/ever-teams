import { EMAIL_REGEX } from "../../../../helpers/regex";
import { authFormValidate } from "../../../../helpers/validations";
import { sendAuthCodeRequest } from "../../requests/auth";

export default async function sendAuthCode(email: string) {

    if (email.trim().length === 0) {
        return {
            error: "Email should not be empty"
        }
    }

    if(!email.match(EMAIL_REGEX)){
        return {
            error: "Email must be a valid email"
        }
    }

    const codeSendRes = await sendAuthCodeRequest(email).catch(() => void 0);

    if (!codeSendRes) {
        return {
            status: 400,
            error: "We couldn't find any account associated to this email"
        }
    }

    // res.status(200).json(codeSendRes.data);
    return {
        status: 200,
        data: codeSendRes.data
    }
}
