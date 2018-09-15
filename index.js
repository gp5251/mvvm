class MVVM {
    constructor(options) {
        const {el, data, computed, template, watch} = options;
        // this.$data = data;

        new Observer(data);
        this.proxy(data);

	if (computed) {
            const that = this;
            Object.keys(computed).forEach(key => {
                Object.defineProperty(this, key, {
                    get() {
                        return computed[key].call(that)
                    }
                });
                new Watcher(that, key, computed[key]);
            });
        }

        if (watch) {
            Object.keys(watch).forEach(key => {
                if (key in this) new Watcher(this, key, watch[key])
            })
        }

        if (template) { // todo
            this.el = document.createElement('div');
            this.el.innerHTML = template;
        } else if (el) {
            this.el = typeof el === 'string' ? document.querySelector(el) : el;
        }

        if (this.el) new Compile(this, this.el);
    }

    proxy(data){
        Object.keys(data).forEach(key => {
            Object.defineProperty(this, key, {
                get() {
                    return data[key]
                },
                set(value) {
                    data[key] = value;
                }
            })
        })
    }

    mountAt(el) {
        el = typeof el === 'string' ? document.querySelector(el) : el;
        if (el) {
            el.replaceWith(this.el);
        }
    }
}

class Observer{
    constructor(data) {
        this.observe(data)
    }

    observe(data) {
        if (Object.prototype.toString.call(data) === '[object Object]') {
            Object.keys(data).forEach(key => {
                this.makeReactive(data, key);
                this.observe(data[key]);
            })
        } else if (Array.isArray(data)) {
            data.forEach(d =>this.observe(d))
        }
    }

    makeReactive(data, key) {
        const that = this;
        const dep = new Dep;
        let value = data[key];
        Object.defineProperty(data, key, {
            get() {
                if (Dep.target) dep.addSub(Dep.target);
                return value;
            },
            set(newValue) {
                if (value !== newValue) {
                    console.log(key, 'changed to', newValue);

                    if (Array.isArray(newValue)) that.patchArray(newValue, dep);

                    value = newValue;
                    that.observe(newValue);
                    dep.notify();
                }
            }
        });

        if (Array.isArray(value)) this.patchArray(value, dep)
    }

    patchArray (arr, dep) {
        const methods = ['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse'];

        Object.defineProperty(arr, '__dep', {
            value: dep,
            enumerable: false
        });

        methods.forEach(method => {
            const originMethod = Array.prototype[method];
            Object.defineProperty(arr, method, {
                enumerable: false,
                value(...args) {
                    const re = originMethod.apply(arr, args);
                    arr.__dep.notify();
                    return re;
                }
            });
        });
    }
}

class Dep{
    constructor() {
        this.watchers = []
    }

    addSub(watcher) {
        if (!this.watchers.includes(watcher)) this.watchers.push(watcher)
    }

    notify() {
        this.watchers.forEach(watcher=>watcher.update())
    }
}

class Watcher{
    constructor(vm, exp, cb) {
        this.vm = vm;
        this.exp = exp;
        this.cb = cb;

        this.value = this.get(); // 读取一次 添加观察
    }
    get() {
        Dep.target = this;
        let value = this.getVal();
        Dep.target = null;
        return value;
    }
    getVal() {
        let {vm, exp} = this;
        return exp.split('.').reduce((prev, next)=> prev[next] , vm)
    }
    update() {
        let newValue = this.getVal();
        this.cb(newValue);
    }
}

class Compile{
    constructor(vm, el){
        // this.el = el; // todo
        this.vm = vm;
        this.walk(el);
    }

    walk(node) {
        if (node.nodeType === 1) {
            // element node
            this.compileEle(node);
        } else if (node.nodeType === 3) {
            // text node
            this.compileText(node);
        }
    }

    compileEle(node) {
        const {attributes, childNodes} = node;

        if (attributes.length)
            for(let i = 0; i < attributes.length; i++) {
                let attrName = attributes[i].name;
                if (attrName.indexOf('v-') === 0) {
                    this.compileToken(attrName, node);
                }
            }

        if (childNodes.length)
            for(let i = 0; i < childNodes.length; i++) {
                this.walk(childNodes[i])
            }
    }

    compileText(textNode) {
        textNode._originValue = textNode.nodeValue;

        const textExp = /\{\{\s*(\w+)\s*\}\}/;
        const match = textNode.nodeValue.match(textExp);
        let i = 0;
        while(match && match[++i]) {
            let key = match[i];
            if (key in this.vm) {
                textNode.nodeValue = textNode._originValue.replace(textExp, this.vm[key]);
                new Watcher(this.vm, key, function(newValue) {
                    textNode.nodeValue = textNode._originValue.replace(textExp, newValue);
                });
            }
        }
    }

    compileToken(token, node) {
        const key = node.getAttribute(token);
        const vm = this.vm;

        if (key in vm) {
            if (token === 'v-text') {
                node.innerHTML = vm[key];
                new Watcher(vm, key, newValue => {
                    node.innerHTML = newValue;
                })
            }

            if (token === 'v-model' && node.tagName.toLowerCase() === 'input') {
                node.value = vm[key];
                node.addEventListener('input', function (e) {
                    vm[key] = e.target.value;
                });

                new Watcher(vm, key, newValue => {
                    node.value = newValue;
                })
            }
        }
    }
}

exports.MVVM=MVVM;
