const {expect} = require('chai');
const {MVVM} = require('../');

describe('test MVVM', function() {
    let m;
    let data;

    before(function() {
        data = {
            a: 1,
            b: 2,
            arr: [],
            obj: {
                c: 3
            }
        };
        m = new MVVM({
            data: JSON.parse(JSON.stringify(data)),
            computed: {
                d() {
                    return this.a + this.b
                }
            },
            watch: {
                arr(re){
                    data.arr = re;
                },
                a(re) {
                    data.a = re;
                },
                b(re) {
                    data.b = re;
                },
                d(re) {
                    data.d = re;
                },
                'obj.c': function (re) {
                    data.obj.c = re;
                }
            }
        });
    });

    after(function() {
        data = null;
        m = null;
    });

    it('it can modify an array', function() {
        m.arr.push(1);
        expect(data.arr.toString()).to.equal(m.arr.toString());
    });

    it('it can replace an array', function() {
        m.arr = [1];
        expect(data.arr.toString()).to.equal(m.arr.toString());
    });

    it('it can modify data', function() {
        m.a = 10;
        expect(data.a).to.equal(10);

        it('it will influence the computed value', function() {
            expect(data.d).to.equal(data.a + data.b);
        });
    });
});

