export function callAsync (callable, context, ...args) {
	try {
		// Call the provided function using the context and arguments given
		const result = callable.apply (context, args);

		// Check if the function returned a simple value or a Promise
		if (result instanceof Promise) {
			return result;
		} else {
			return Promise.resolve (result);
		}
	} catch (e) {
		return Promise.reject (e);
	}
}