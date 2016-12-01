class Parent {
	static foo () {
		console.log('foo');
		return 'foo';
	}
}

class Child extends Parent  {

}

Child.foo();