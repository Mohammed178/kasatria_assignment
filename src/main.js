import './style.css';
import { initScene, showLayout } from './scene.js';

const container = document.getElementById('container');
initScene(container);

document.getElementById('table').addEventListener('click', () => showLayout('table'));
document.getElementById('sphere').addEventListener('click', () => showLayout('sphere'));
document.getElementById('helix').addEventListener('click', () => showLayout('helix'));
document.getElementById('grid').addEventListener('click', () => showLayout('grid'));
