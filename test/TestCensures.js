const Azimuth = artifacts.require('../contracts/Azimuth.sol');
const Censures = artifacts.require('../contracts/Censures.sol');

const assertRevert = require('./helpers/assertRevert');

contract('Censures', function([owner, user]) {
  let azimuth, cens;

  before('setting up for tests', async function() {
    azimuth = await Azimuth.new();
    await azimuth.setOwner(0, owner);
    await azimuth.activatePoint(0);
    await azimuth.setOwner(256, owner);
    await azimuth.activatePoint(256);
    await azimuth.setOwner(65792, owner);
    await azimuth.activatePoint(65792);
    cens = await Censures.new(azimuth.address);
  });

  it('censuring', async function() {
    assert.equal(await cens.getCensuringCount(0), 0);
    // stars can't censor galaxies.
    await assertRevert(cens.censure(256, 0));
    // can't self-censor.
    await assertRevert(cens.censure(256, 256));
    // only point owner can do this.
    await assertRevert(cens.censure(0, 1, {from:user}));
    await cens.censure(0, 1);
    assert.equal(await cens.getCensuringCount(0), 1);
    // can't censure twice.
    await assertRevert(cens.censure(0, 1));
    await cens.censure(0, 2);
    await cens.censure(0, 3);
    await cens.censure(0, 4);
    let censures = await cens.getCensuring(0);
    assert.equal(censures[0].toNumber(), 1);
    assert.equal(censures[1].toNumber(), 2);
    assert.equal(censures[2].toNumber(), 3);
    assert.equal(censures[3].toNumber(), 4);
    // check reverse lookup
    assert.equal(await cens.getCensuredByCount(1), 1);
    let censured = await cens.getCensuredBy(1);
    assert.equal(censured[0].toNumber(), 0);
  });

  it('forgiving', async function() {
    // can't forgive the uncensured.
    await assertRevert(cens.forgive(0, 5));
    // only point owner can do this.
    await assertRevert(cens.forgive(0, 2, {from:user}));
    await cens.forgive(0, 2);
    let censures = await cens.getCensuring(0);
    assert.equal(censures[0].toNumber(), 1);
    assert.equal(censures[1].toNumber(), 4);
    assert.equal(censures[2].toNumber(), 3);
    assert.equal(await cens.getCensuringCount(0), 3);
    assert.equal(await cens.getCensuredByCount(2), 0);
    // ensure we can safely interact with a censure that got moved internally
    await cens.forgive(0, 4);
    censures = await cens.getCensuring(0);
    assert.equal(censures[0].toNumber(), 1);
    assert.equal(censures[1].toNumber(), 3);
    assert.equal(await cens.getCensuringCount(0), 2);
  });
});
