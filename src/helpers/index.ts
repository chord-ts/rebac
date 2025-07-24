export async function checkSequence(
  ...sequence: (() => Promise<void | never>)[]
): Promise<void | never> {
  for (const callbackCheck of sequence) {
    await callbackCheck()
  }
}

export async function throwable(result: Promise<boolean>, errorMsg: string) {
  if (!(await result)) {
    throw Error( errorMsg)
  }
}
