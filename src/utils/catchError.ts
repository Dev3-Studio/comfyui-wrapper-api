export default function catchError<T, E extends new (message?: string) => Error>(
    promise: Promise<T>,
    errorsToCatch?: E[],
): Promise<[undefined, T] | [InstanceType<E>]> {
    return promise
        .then((data) => {
            return [undefined, data] as [undefined, T];
        })
        .catch((error) => {
            // catch all if no errorsToCatch are provided
            if (errorsToCatch == undefined) {
                return [error];
            }

            // catch only specified errors
            if (errorsToCatch.some((e) => error instanceof e)) {
                return [error];
            }

            // throw any unspecified errors
            throw error;
        });
}