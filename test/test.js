var chai = require('chai'),
    should = chai.should,
    expect = chai.expect,
    Promise = require('bluebird'),
    request = require('superagent-promise')(require('superagent'), Promise),
    chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
var url = process.env.URL || 'http://localhost:8000/todos';


describe('Cross Origin Requests', function() {
  var result;

  before(function() {
      result = request('OPTIONS', url)
        .set('Origin', 'http://someplace.com')
        .end();
  });

  it('should return the correct CORS headers', function() {
    return assert(result, "headers").to.contain.all.keys([
      'access-control-allow-origin',
      'access-control-allow-methods',
      'access-control-allow-headers'
    ]);
  });

  it('should allow all origins', function() {
  	return result
  		.then((data) => {
  			expect(data.headers['access-control-allow-origin']).to.equal('*');
    	})
  });
});

describe('Create Todo Item', function() {
  var result;

  before(function() {
    result = post(url, { title: 'Walk the dog' });
  });

  it('should return a 201 CREATED response', function() {
    return assert(result, "status").to.equal(201);
  });

  it('should receive a location hyperlink', function() {
    return expect(result._rejectionHandler0.headers.location).to.match(/^http?:\/\/.+\/todos\/[\d]+$/);
  });

  it('should create the item', () => {
    var getResult = result
    	.then((res) => {
    		return get(res.header.location);
    });

    return getResult.then((getRes) => {
    	expect(getRes.body.title).that.equals('Walk the dog');
     });
  });

  after(function () {
    return del(url);
  });
});

describe('Update Todo Item', function() {
  var location;

  beforeEach(function(done) {
    post(url, {title: 'Walk the dog'}).then(function(res) {
      location = res.header['location'];
      done();
    });
  });

  it('should have completed set to true after PUT update', function() {
    
    return update(location, 'PUT', {'completed': true})
    	.then(function (res) {
    		 expect(res.body.completed).to.be.true;
    	});
  });

  it('should have completed set to true after PATCH update', function() {
    return update(location, 'PATCH', {'completed': true})
    	.then(function (res) {
    		expect(res.body.completed).to.be.true;
    	})
  });

  after(function () {
    return del(url);
  });
});

describe('Delete Todo Item', function() {
  var location;

  beforeEach((done) => {
    post(url, {title: 'Walk the dog'}).then((res) => {
      location = res.header['location'];
      done();
    });
  });

  it('should return a 204 NO CONTENT response', () => {
    return assert(del(location), "status").to.equal(204);
  });

  it('should delete the item', () => {
    return del(location).then((res) => {
      expect(get(location)).to.eventually.be.rejectedWith('Not Found');
    });
    //return ;
  });
});

/*
 * Convenience functions
 */

// POST request with data and return promise
function post(url, data) {
  return request.post(url)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json')
    .send(data)
    .end();
}

// GET request and return promise
function get(url) {
  return request.get(url)
    .set('Accept', 'application/json')
    .end();
}

// DELETE request and return promise
function del(url) {
  return request.del(url).end();
}

// UPDATE request with data and return promise
function update(url, method, data) {
  return request(method, url)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json')
    .send(data)
    .end();
}

// Resolve promise for property and return expectation
function assert(result, prop) {
  return expect(result).to.eventually.have.deep.property(prop)
}