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

export function deserializeCSS (object, level = 0) {
	const keys = Object.keys (object);

	let css = '';

	for (const key of keys) {
		console.log (key);
		if (typeof object[key] === 'object') {
			css += `${key} {\n`;
			const properties = Object.keys (object[key]);
			for (const property of properties) {
				console.log (object[key][property]);
				css += '\t'.repeat (level);
				if (typeof object[key][property] === 'object') {
					const temp = {};
					temp[property] = object[key][property];

					css += deserializeCSS (temp, level + 1);
				} else {
					css += `\t${property}: ${object[key][property]};\n`;
				}
			}
			css += '}\n';
		} else {
			css += '\t'.repeat (level);
			css += `\t${key}: ${object[key]};\n`;
		}
	}

	return css;
}
