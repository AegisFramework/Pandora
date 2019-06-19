class CustomElement extends Pandora.Component {

	constructor () {
		super ();
		this.props = {
			text: ''
		};
	}

	render () {
		return `<h2>${this.props.text}</h2>`;
	}
}

console.log (CustomElement.tag);

window.customElements.define (CustomElement.tag, CustomElement);

const element = document.querySelector ('custom-element');

element.setProps ( {
	text: 'Hello World!'
});


class CustomShadowElement extends Pandora.ShadowComponent {
	constructor () {
		super ();
		this.props = {
			text: ''
		};
	}

	render () {
		return `<h2>${this.props.text}</h2>`;
	}
}

console.log (CustomShadowElement.tag);

window.customElements.define (CustomShadowElement.tag, CustomShadowElement);

const shadowElement = document.querySelector (CustomShadowElement.tag);

shadowElement.setProps ( {
	text: 'Hello World!'
});

shadowElement.setStyle ({
	h2: {
		color: '#eee'
	},
	'@media screen and (min-width: 62em)': {
		h2: {
			color: 'black'
		}
	}
});

window.customElements.define ('responsive-navigation', ResponsiveNavigation, { extends: 'nav' });

const navigation = document.querySelector('responsive-navigation');

navigation.setProps ({
	items: [
		{
			text: 'Home',
			link: '#'
		},
		{
			text: 'Blog',
			link: '#'
		},
		{
			text: 'Pricing',
			link: '#'
		},
		{
			text: 'About',
			link: '#'
		},
		{
			text: 'Jobs',
			link: '#'
		},
		{
			text: 'Gallery',
			link: '#'
		},

	]
});