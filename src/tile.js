import { CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer.js';

export function createElementTile(symbol, name, weight, number) {
	const element = document.createElement('div');
	element.className = 'element';
	element.style.backgroundColor = 'rgba(0,127,127,' + (Math.random() * 0.5 + 0.25) + ')';

	const numberEl = document.createElement('div');
	numberEl.className = 'number';
	numberEl.textContent = number;
	element.appendChild(numberEl);

	const symbolEl = document.createElement('div');
	symbolEl.className = 'symbol';
	symbolEl.textContent = symbol;
	element.appendChild(symbolEl);

	const details = document.createElement('div');
	details.className = 'details';
	details.innerHTML = name + '<br>' + weight;
	element.appendChild(details);

	return new CSS3DObject(element);
}
