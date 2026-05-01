const MOCK_MODE = process.env.SMS_MOCK_MODE !== 'false'

async function sendSms(phone: string, message: string): Promise<void> {
  if (MOCK_MODE) {
    console.log(`[MOCK SMS] To: ${phone}\n${message}`)
    return
  }
  // TODO: replace with your SMS provider (e.g. Smsnative, Africa's Talking)
  // await fetch('https://api.smsnative.com/send', {
  //   method: 'POST',
  //   headers: { Authorization: `Bearer ${process.env.SMSNATIVE_API_KEY}` },
  //   body: JSON.stringify({ phone, message }),
  // })
}

export async function notifyBalanceLow(
  parentPhone: string,
  parentName: string,
  studentName: string,
  balanceUgx: number,
  thresholdUgx: number
): Promise<void> {
  const message =
    `SpeedWallets Alert: ${studentName}'s wallet balance is now ` +
    `UGX ${balanceUgx.toLocaleString()}, below your alert threshold of ` +
    `UGX ${thresholdUgx.toLocaleString()}. Please top up soon.`
  await sendSms(parentPhone, message)
}

export async function notifyStudentSelfTopUp(
  parentPhone: string,
  parentName: string,
  studentName: string,
  amountUgx: number,
  newBalanceUgx: number
): Promise<void> {
  const message =
    `SpeedWallets: ${studentName} has topped up their own wallet with ` +
    `UGX ${amountUgx.toLocaleString()}. New balance: UGX ${newBalanceUgx.toLocaleString()}.`
  await sendSms(parentPhone, message)
}

export async function notifyTopUpSuccess(
  parentPhone: string,
  studentName: string,
  amountUgx: number,
  newBalanceUgx: number
): Promise<void> {
  const message =
    `SpeedWallets: Your top-up of UGX ${amountUgx.toLocaleString()} to ` +
    `${studentName}'s wallet was successful. New balance: UGX ${newBalanceUgx.toLocaleString()}.`
  await sendSms(parentPhone, message)
}

export async function notifyParentAccountCreated(
  parentPhone: string,
  parentName: string,
  pin: string,
  loginUrl: string
): Promise<void> {
  const message =
    `Welcome to SpeedWallets, ${parentName}!\n` +
    `Your parent account has been created.\n` +
    `Login: ${loginUrl}\n` +
    `Phone: ${parentPhone}\n` +
    `PIN: ${pin}\n` +
    `Please change your PIN after your first login.`
  await sendSms(parentPhone, message)
}

export async function notifyStudentRegistration(
  studentPhone: string,
  studentName: string,
  pin: string,
  rfidCode: string,
  loginUrl: string
): Promise<void> {
  const message =
    `Welcome to SpeedWallets, ${studentName}!\n` +
    `Your school wallet is ready.\n` +
    `Login: ${loginUrl}\n` +
    `Phone: ${studentPhone}\n` +
    `PIN: ${pin}\n` +
    `RFID: ${rfidCode}\n` +
    `Please change your PIN after your first login.`
  await sendSms(studentPhone, message)
}

export async function notifyParentOfStudentRegistration(
  parentPhone: string,
  parentName: string,
  studentName: string,
  parentPin: string | null,
  studentPin: string,
  loginUrl: string
): Promise<void> {
  const pinLine = parentPin ? `Your PIN: ${parentPin}\n` : ''
  const message =
    `Hello ${parentName}, ${studentName} has been enrolled on SpeedWallets.\n` +
    `Login: ${loginUrl}\n` +
    `Phone: ${parentPhone}\n` +
    pinLine +
    `Student PIN: ${studentPin}\n` +
    `Please change your PIN after your first login.`
  await sendSms(parentPhone, message)
}
