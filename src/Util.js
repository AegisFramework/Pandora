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

export function deserializeCSS (object, encapsulation = '', level = 0, ) {
	const keys = Object.keys (object);

	let css = '';

	for (const key of keys) {
		if (typeof object[key] === 'object') {
			if (encapsulation) {
				if (key.indexOf ('&') === 0) {
					css += `${key.replace(/&/g, encapsulation)} {\n`;
				} else {
					css += `${encapsulation} ${key} {\n`;
				}
			} else {
				css += `${key} {\n`;
			}

			const properties = Object.keys (object[key]);
			for (const property of properties) {
				css += '\t'.repeat (level);
				if (typeof object[key][property] === 'object') {
					const temp = {};
					temp[property] = object[key][property];

					css += deserializeCSS (temp, encapsulation, level + 1);
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
