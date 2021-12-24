const style = (props) => `
	* ==============================
	* Responsive Navigation
	*
	* From: https://gitlab.com/AegisFramework/Kayros
	* ==============================
	*/

	:host([fixed]) {
		position: fixed;
		max-height: 100%;
		overflow: auto;
	}

	:host(.rl) {
		text-align: left;
	}

	li {
		display: flex;
		list-style: none;
		cursor: pointer;
		text-align: center;
		overflow: visible;
		background: inherit;
		width: 100%;
		height: auo;
	}

	li > * {

		display: flex;
		align-items: center;
		width: 100%;
		padding: 1rem;
		align-items: baseline;
	}

	li:hover {
		background-color: #eee;
	}

	li:empty {
		padding: 1rem;
	}

	li .icon {
		-ms-grid-row-align: center;
		align-self: center;
		max-height: 100%;
		max-width: 100%;
		margin: 0 .3rem;
		height: 60%;
		width: 1.5rem;
		min-width: 1.5rem;
	}

	.menu-icon {
		cursor: pointer;
		-ms-grid-row-align: center;
		align-self: center;
		max-width: 10%;
	}

	header {
		display: flex;
		max-width: 90%;
		max-height: 3.5rem;
		text-align: left;
		font-size: inherit;
		height: 100%;
		min-height: 100%;
		width: 100%;
		height: 3.5rem;
	}

	header .logo {
		-ms-grid-row-align: center;
		align-self: center;
		max-width: 80%;
		max-height: 80%;
		padding: 0 .5rem;
		height: 100%;
	}

	header .title {
		-ms-grid-row-align: center;
		align-self: center;
		margin: 0;
		margin-left: .1rem;
		font-size: 1.5rem;
	}

	ul {
		margin: 0;
		padding: 0;
		width: auto;
		max-height: 100%;
		display: none;
		align-items: center;
	}

	:host([active="true"]) ul {
		display: flex;
		width: 100%;
		flex-flow: column;
		background: inherit;
		overflow: auto;
	}

	:host {
		display: flex;
		width: 100%;
		background-color: #fff;
		text-align: right;
		min-height: 3rem;
		align-items: stretch;
		z-index: 90;
		flex-wrap: wrap;
		max-width: 100%;
	}

	a {
			color: inherit;
			text-decoration: none;
	}

	@media (min-width: ${props['phablet-breakpoint']}) {
		:host([phablet="top"]) {
			display: flex;
			overflow: hidden;
			flex-wrap: nowrap;
		}

		:host([phablet="top"]) .menu-icon {
			display: none;
		}

		:host([phablet="top"]) ul {
			display: flex;
			max-height: 3.5rem;
		}

		:host([phablet="top"]) ul li {
			height: 100%;
		}

		:host([phablet="top"]) ul li > * {
			justify-content: center;
		}

		:host([phablet="top"]) ul[full] {
			display: flex;
			width: 100%;
			justify-content: center;
			height: 3.5rem;
		}

		:host([phablet="top"]) ul[full] li {
			height: 100%;
		}

		:host([phablet="top"]) ul[full] li > * {
			justify-content: center;
		}

		:host([phablet="side"]) {
			width: 30%;
			height: 100%;
			float: left;
			max-height: 100%;
			flex-flow: column;
			overflow: hidden;
		}

		:host([phablet="side"]) header {
			height: auto;
			min-height: 0;
			min-height: initial;
			flex-flow: column;
			padding-bottom: .5rem;
			border-bottom: 1px solid #eee;
			max-height: none;
			max-height: initial;
			max-width: 100%;
			flex-shrink: 0;
		}

		:host([phablet="side"]) header .logo {
			max-height: 10rem;
			margin: .5rem 0;
		}

		:host([phablet="side"]) header .title {
			text-align: center;
		}

		:host([phablet="side"]) .menu-icon {
			display: none;
		}

		:host([phablet="side"]) ul {
			display: flex;
			flex-flow: column;
			overflow: auto;
			max-height: initial;
			height: 100%;
			overflow-x: hidden;
		}

		:host([phablet="side"]) ul li {
			height: auto;
			width: 100%;
			min-height: 2rem;
		}

		:host([phablet="side"]) ul li > * {
			width: 100%;
			justify-content: flex-start;
		}

		:host([phablet="side"]) ul li .icon {
			max-height: 100%;
			height: 2rem;
			min-height: 1.5rem;
			line-height: 1.4rem;
		}

	}

	@media (min-width: ${props['tablet-breakpoint']}) {
		:host([tablet="top"]) {
			display: flex;
			overflow: hidden;
			flex-wrap: nowrap;
		}

		:host([tablet="top"]) .menu-icon {
			display: none;
		}

		:host([tablet="top"]) ul {
			display: flex;
			max-height: 3.5rem;
		}

		:host([tablet="top"]) ul li {
			height: 100%;
		}

		:host([tablet="top"]) ul li > * {
			justify-content: center;
		}

		:host([tablet="top"]) ul[full] {
			display: flex;
			width: 100%;
			justify-content: center;
			height: 3.5rem;
		}

		:host([tablet="top"]) ul[full] li {
			height: 100%;
		}

		:host([tablet="top"]) ul[full] li > * {
			justify-content: center;
		}

		:host([tablet="side"]) {
			width: 20%;
			height: 100%;
			float: left;
			max-height: 100%;
			flex-flow: column;
			overflow: hidden;
		}

		:host([tablet="side"]) header {
			height: auto;
			min-height: 0;
			min-height: initial;
			flex-flow: column;
			padding-bottom: .5rem;
			border-bottom: 1px solid #eee;
			max-height: none;
			max-height: initial;
			max-width: 100%;
			flex-shrink: 0;
		}

		:host([tablet="side"]) header .logo {
			max-height: 10rem;
			margin: .5rem 0;
		}

		:host([tablet="side"]) header .title {
			text-align: center;
		}

		:host([tablet="side"]) .menu-icon {
			display: none;
		}

		:host([tablet="side"]) ul {
			display: flex;
			flex-flow: column;
			overflow: auto;
			max-height: initial;
			height: 100%;
			overflow-x: hidden;
		}

		:host([tablet="side"]) ul li {
			height: auto;
			width: 100%;
			min-height: 2rem;
		}

		:host([tablet="side"]) ul li > * {
			width: 100%;
			justify-content: flex-start;
		}

		:host([tablet="side"]) ul li .icon {
			max-height: 100%;
			height: 2rem;
			min-height: 1.5rem;
			line-height: 1.4rem;
		}

	}

	@media (min-width: ${props['desktop-breakpoint']}) {
		:host([desktop="top"]) {
			display: flex;
			overflow: hidden;
			flex-wrap: nowrap;
		}

		:host([desktop="top"]) .menu-icon {
			display: none;
		}

		:host([desktop="top"]) ul {
			display: flex;
			max-height: 3.5rem;
		}

		:host([desktop="top"]) ul li {
			height: 100%;
		}

		:host([desktop="top"]) ul li > * {
			justify-content: center;
		}

		:host([desktop="top"]) ul[full] {
			display: flex;
			width: 100%;
			justify-content: center;
			height: 3.5rem;
		}

		:host([desktop="top"]) ul[full] li {
			height: 100%;
		}

		:host([desktop="top"]) ul[full] li > * {
			justify-content: center;
		}

		:host([desktop="side"]) {
			width: 20%;
			height: 100%;
			float: left;
			max-height: 100%;
			flex-flow: column;
			overflow: hidden;
		}

		:host([desktop="side"]) header {
			height: auto;
			min-height: 0;
			min-height: initial;
			flex-flow: column;
			padding-bottom: .5rem;
			border-bottom: 1px solid #eee;
			max-height: none;
			max-height: initial;
			max-width: 100%;
			flex-shrink: 0;
		}

		:host([desktop="side"]) header .logo {
			max-height: 10rem;
			margin: .5rem 0;
		}

		:host([desktop="side"]) header .title {
			text-align: center;
		}

		:host([desktop="side"]) .menu-icon {
			display: none;
		}

		:host([desktop="side"]) ul {
			display: flex;
			flex-flow: column;
			overflow: auto;
			max-height: initial;
			height: 100%;
			overflow-x: hidden;
		}

		:host([desktop="side"]) ul li {
			height: auto;
			width: 100%;
			min-height: 2rem;
		}

		:host([desktop="side"]) ul li > * {
			width: 100%;
			justify-content: flex-start;
		}

		:host([desktop="side"]) ul li .icon {
			max-height: 100%;
			height: 2rem;
			min-height: 1.5rem;
			line-height: 1.4rem;
		}
	}

	@media (min-width: ${props['desktop-large-breakpoint']}) {
		:host([desktop-large="top"]) {
			display: flex;
			overflow: hidden;
			flex-wrap: nowrap;
		}

		:host([desktop-large="top"]) .menu-icon {
			display: none;
		}

		:host([desktop-large="top"]) ul {
			display: flex;
			max-height: 3.5rem;
		}

		:host([desktop-large="top"]) ul li {
			height: 100%;
		}

		:host([desktop-large="top"]) ul li > * {
			justify-content: center;
		}

		:host([desktop-large="top"]) ul[full] {
			display: flex;
			width: 100%;
			justify-content: center;
			height: 3.5rem;
		}

		:host([desktop-large="top"]) ul[full] li {
			height: 100%;
		}

		:host([desktop-large="top"]) ul[full] li > * {
			justify-content: center;
		}

		:host([desktop-large="side"]) {
			width: 15%;
			height: 100%;
			float: left;
			max-height: 100%;
			flex-flow: column;
			overflow: hidden;
		}

		:host([desktop-large="side"]) header {
			height: auto;
			min-height: 0;
			min-height: initial;
			flex-flow: column;
			padding-bottom: .5rem;
			border-bottom: 1px solid #eee;
			max-height: none;
			max-height: initial;
			max-width: 100%;
			flex-shrink: 0;
		}

		:host([desktop-large="side"]) header .logo {
			max-height: 10rem;
			margin: .5rem 0;
		}

		:host([desktop-large="side"]) header .title {
			text-align: center;
		}

		:host([desktop-large="side"]) .menu-icon {
			display: none;
		}

		:host([desktop-large="side"]) ul {
			display: flex;
			flex-flow: column;
			overflow: auto;
			max-height: initial;
			height: 100%;
			overflow-x: hidden;
		}

		:host([desktop-large="side"]) ul li {
			height: auto;
			width: 100%;
			min-height: 2rem;
		}

		:host([desktop-large="side"]) ul li > * {
			width: 100%;
			justify-content: flex-start;
		}

		:host([desktop-large="side"]) ul li .icon {
			max-height: 100%;
			height: 2rem;
			min-height: 1.5rem;
			line-height: 1.4rem;
		}
	}
`;

class ResponsiveNavigation extends Pandora.ShadowComponent {

	constructor () {
		super ();

		this.props = {
			'title': '',
			'logo': '',
			'items': [],
			'active': false,

			// Behaviors
			'phone': 'top',
			'phablet': 'top',
			'tablet': 'side',
			'desktop': 'side',
			'desktop-large': 'side',
			'retina': 'side',
			'fixed': false,
			'side': 'left',

			// Breakpoints
			'phone-breakpoint': '480px',
			'phablet-breakpoint': '601px',
			'tablet-breakpoint': '992px',
			'desktop-breakpoint': '1200px',
			'desktop-large-breakpoint': '1900px',
			'retina-breakpoint': '2500px',
		};

	}

	willMount () {
		this.setStyle (style (this.props));
		return Promise.resolve ();
	}

	didMount () {
		this.dom.querySelector('.menu-icon').onclick = () => {
			this.setProps({
				active: this.props.active !== 'true'
			});
		};
		return Promise.resolve ();
	}

	render () {
		return `
			${ this.props.logo || this.props.title ? `
				<header>
					${ this.props.logo ? `<img src="${this.props.logo}" class="logo">` : '' }
					${ this.props.title ? `<h1 class="title">${this.props.title}</h1>` : '' }
				</header>
			`: '' }
			<i class="menu-icon">Menu</i>
			<ul>
				${this.props.items.map (item => `
					<li>
						${ item.link ? `<a href="${item.link}">` : '' }
							${ item.icon ? `<img  src="${item.icon}" class="icon">`: '' }
								${ item.text ? item.text : ''}
							${ item.link ? '</a>' : '' }
					</li>

				`).join ('')}
			</ul>
		`;
	}
}

ResponsiveNavigation.tag = 'responsive-navigation';

window.customElements.define ('responsive-navigation', ResponsiveNavigation, { extends: 'nav' });
