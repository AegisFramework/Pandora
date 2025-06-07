/// <reference types="./../dist/types/index.d.ts" />
import { Component } from './../dist/pandora.js';

const component = new Component();

component.setProps({
  name: 'John',
  age: 30
});

console.log(component.props);