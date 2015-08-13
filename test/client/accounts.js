/**
 * augur.js unit tests
 * @author Jack Peterson (jack@tinybike.net)
 */

"use strict";

var crypto = require("crypto");
var assert = require("chai").assert;
var chalk = require("chalk");
var EthTx = require("ethereumjs-tx");
var EthUtil = require("ethereumjs-util");
var utils = require("../../src/utilities");
var augur = utils.setup(require("../../src"), process.argv.slice(2));
var constants = augur.constants;
var numeric = augur.numeric;
var log = console.log;

// generate random private key
var privateKey = crypto.randomBytes(32);

// generate random handles and passwords
var handle = utils.sha256(new Date().toString());
var password = utils.sha256(Math.random().toString(36).substring(4));
var handle2 = utils.sha256(new Date().toString()).slice(10);
var password2 = utils.sha256(Math.random().toString(36).substring(4)).slice(10);

describe("Register", function () {

    it("register account 1: " + handle + " / " + password, function (done) {
        this.timeout(constants.TIMEOUT);
        augur.db.get(handle, function (record) {
            assert(record.error);
            assert.strictEqual(record.error, 99);
            augur.web.register(handle, password, function (result) {
                if (result.error) {
                    augur.web.logout(); done(result);
                } else {
                    assert(!result.error);
                    assert.property(result, "nonce");
                    assert(result.privateKey);
                    assert(result.address);
                    assert.strictEqual(
                        result.privateKey.toString("hex").length,
                        constants.KEYSIZE*2
                    );
                    assert.strictEqual(result.address.length, 42);
                    augur.db.get(handle, function (rec) {
                        if (rec.error) {
                            augur.web.logout(); done(rec);
                        } else {
                            assert(!rec.error);
                            assert.property(rec, "nonce");
                            assert(rec.privateKey);
                            assert(rec.iv);
                            assert(rec.salt);
                            assert.strictEqual(
                                new Buffer(rec.iv, "base64")
                                    .toString("hex")
                                    .length,
                                constants.IVSIZE*2
                            );
                            assert.strictEqual(
                                new Buffer(rec.salt, "base64")
                                    .toString("hex")
                                    .length,
                                constants.KEYSIZE*2
                            );
                            assert.strictEqual(
                                new Buffer(rec.privateKey, "base64")
                                    .toString("hex")
                                    .length,
                                constants.KEYSIZE*2
                            );
                            augur.web.logout();
                            done();
                        }
                    });
                }
            });
        });
    });

    it("register account 2: " + handle2 + " / " + password2, function (done) {
        this.timeout(constants.TIMEOUT);
        augur.db.get(handle2, function (record) {
            assert(record.error);
            augur.web.register(handle2, password2, function (result) {
                if (result.error) {
                    augur.web.logout(); done(result);
                } else {
                    assert(!result.error);
                    assert.property(result, "nonce");
                    assert(result.privateKey);
                    assert(result.address);
                    assert.strictEqual(
                        result.privateKey.toString("hex").length,
                        constants.KEYSIZE*2
                    );
                    assert.strictEqual(result.address.length, 42);
                    augur.db.get(handle2, function (rec) {
                        if (rec.error) {
                            augur.web.logout(); done(rec);
                        } else {
                            assert(!rec.error);
                            assert.property(rec, "nonce");
                            assert(rec.privateKey);
                            assert(rec.iv);
                            assert(rec.salt);
                            assert.strictEqual(
                                new Buffer(rec.iv, "base64")
                                    .toString("hex")
                                    .length,
                                constants.IVSIZE*2
                            );
                            assert.strictEqual(
                                new Buffer(rec.salt, "base64")
                                    .toString("hex")
                                    .length,
                                constants.KEYSIZE*2
                            );
                            assert.strictEqual(
                                new Buffer(rec.privateKey, "base64")
                                    .toString("hex")
                                    .length,
                                constants.KEYSIZE*2
                            );
                            augur.web.logout();
                            done();
                        }
                    });
                }
            });
        });
    });

    it("fail to register account 1's handle again", function (done) {
        this.timeout(constants.TIMEOUT);
        augur.web.register(handle, password, function (result) {
            assert(!result.privateKey);
            assert(!result.address);
            assert(result.error);
            augur.db.get(handle, function (record) {
                assert(!record.error);
                done();
            });
        });
    });

});

describe("Login", function () {

    it("login and decrypt the stored private key", function (done) {
        this.timeout(constants.TIMEOUT);
        augur.web.login(handle, password, function (user) {
            if (user.error) {
                augur.web.logout(); done(user);
            } else {
                assert(!user.error);
                assert.property(user, "nonce");
                assert(user.privateKey);
                assert(user.address);
                assert.strictEqual(
                    user.privateKey.toString("hex").length,
                    constants.KEYSIZE*2
                );
                assert.strictEqual(user.address.length, 42);
                augur.web.logout();
                done();
            }
        });
    });

    it("login twice as the same user", function (done) {
        this.timeout(constants.TIMEOUT);
        augur.web.login(handle, password, function (user) {
            if (user.error) {
                augur.web.logout(); done(user);
            } else {
                assert.property(user, "nonce");
                assert(user.privateKey);
                assert(user.address);
                assert.strictEqual(user.privateKey.toString("hex").length, constants.KEYSIZE*2);
                assert.strictEqual(user.address.length, 42);
                augur.web.login(handle, password, function (same_user) {
                    if (same_user.error) {
                        augur.web.logout(); done(same_user);
                    } else {
                        assert(!same_user.error);
                        assert.strictEqual(user.privateKey.toString("hex"), same_user.privateKey.toString("hex"));
                        assert.strictEqual(user.address, same_user.address);
                        done();
                    }
                });
            }
        });
    });

    it("fail with error 403 when given an incorrect handle", function (done) {
        this.timeout(constants.TIMEOUT);
        var bad_handle = utils.sha256(new Date().toString());
        augur.web.login(bad_handle, password, function (user) {
            assert.strictEqual(user.error, 403);
            done();
        });
    });

    it("fail with error 403 when given an incorrect password", function (done) {
        this.timeout(constants.TIMEOUT);
        var bad_password = utils.sha256(Math.random().toString(36).substring(4));
        augur.web.login(handle, bad_password, function (user) {
            assert.strictEqual(user.error, 403);
            done();
        });
    });

    it("fail with error 403 when given an incorrect handle and an incorrect password", function (done) {
        this.timeout(constants.TIMEOUT);
        var bad_handle = utils.sha256(new Date().toString());
        var bad_password = utils.sha256(Math.random().toString(36).substring(4));
        augur.web.login(handle, bad_password, function (user) {
            assert.strictEqual(user.error, 403);
            done();
        });
    });

});

describe("Logout", function () {

    it("logout and unset the account object", function (done) {
        this.timeout(constants.TIMEOUT);
        augur.web.login(handle, password, function (user) {
            if (user.error) {
                augur.web.logout(); done(user);
            } else {
                assert.strictEqual(user.handle, handle);
                augur.web.logout();
                assert(!augur.web.account.handle);
                assert(!augur.web.account.address);
                assert(!augur.web.account.privateKey);
                assert(!augur.web.account.nonce);
                done();
            }
        });
    });

});

describe("Fund", function () {

    var recipient = "0x639b41c4d3d399894f2a57894278e1653e7cd24c";

    it("send " + constants.FREEBIE + " ether to " + recipient, function (done) {

        this.timeout(constants.TIMEOUT);

        var initial_balance = numeric
            .bignum(augur.balance(recipient))
            .dividedBy(constants.ETHER);

        augur.web.fund({ address: recipient }, null, function (account) {
            if (account.error) {
                done(account);
            } else {
                assert.property(account, "address");
                assert.strictEqual(account.address, recipient);

                var final_balance = numeric
                    .bignum(augur.balance(recipient))
                    .dividedBy(constants.ETHER);

                assert(final_balance.sub(initial_balance).toNumber() >= 50);
                done();
            }
        });
    });

});

// describe("Send Ether", function () {

//     var amount = 64;

//     it("coinbase -> account 1 [" + amount + "]", function (done) {
//         this.timeout(constants.TIMEOUT);
//         augur.db.get(handle, function (toAccount) {
//             augur.sendEther(
//                 toAccount.address,
//                 amount,
//                 augur.coinbase,
//                 function (r) {
//                     // sent
//                     // log("sent:", r);
//                 },
//                 function (r) {
//                     // log("success:", r);
//                     done();
//                 },
//                 function (r) {
//                     r.name = r.error; throw r;
//                     done(r);
//                 }
//             );
//         });
//     });

//     it("account 1 -> account 2 [" + amount / 2 + "]", function (done) {
//         this.timeout(constants.TIMEOUT);
//         augur.web.login(handle, password, function (user) {
//             augur.web.sendEther(
//                 handle2,
//                 amount / 2,
//                 function (r) {
//                     log("sent:", r);
//                 },
//                 function (r) {
//                     log("success:", r);
//                     done();
//                 },
//                 function (r) {
//                     done(r);
//                 }
//             );
//         });
//     });

// });

// describe("Send Cash", function () {

//     var amount = 10;

//     it("coinbase -> account 1 [" + amount + "]", function (done) {
//         this.timeout(constants.TIMEOUT);
//         augur.db.get(handle, function (toAccount) {
//             augur.sendCash(
//                 toAccount.address,
//                 amount,
//                 augur.coinbase,
//                 function (r) {
//                     // sent
//                 },
//                 function (r) {
//                     done();
//                 },
//                 function (r) {
//                     r.name = r.error; throw r;
//                     done(r);
//                 }
//             );
//         });
//     });

//     it("account 1 -> account 2 [" + amount / 2 + "]", function (done) {
//         this.timeout(constants.TIMEOUT);
//         augur.web.login(handle, password, function (user) {
//             augur.web.sendCash(
//                 handle2,
//                 amount / 2,
//                 function (r) {
//                     log("sent:", r);
//                 },
//                 function (r) {
//                     log("success:", r);
//                     done();
//                 },
//                 function (r) {
//                     r.name = r.error; throw r;
//                     done();
//                 }
//             );
//         });
//     });

// });

// describe("Send Reputation", function () {

//     var amount = 2;

//     it("coinbase -> account 1 [" + amount + "]", function (done) {
//         this.timeout(constants.TIMEOUT);
//         augur.db.get(handle, function (toAccount) {
//             augur.sendReputation(
//                 augur.branches.dev,
//                 toAccount.address,
//                 amount,
//                 augur.coinbase,
//                 function (r) {
//                     // sent
//                 },
//                 function (r) {
//                     done();
//                 },
//                 function (r) {
//                     r.name = r.error; throw r;
//                     done(r);
//                 }
//             );
//         });
//     });

//     it("account 1 -> account 2 [" + amount / 2 + "]", function (done) {
//         this.timeout(constants.TIMEOUT);
//         augur.web.login(handle, password, function (user) {
//             augur.web.sendReputation(
//                 handle2,
//                 amount / 2,
//                 function (r) {
//                     log("sent:", r);
//                 },
//                 function (r) {
//                     log("success:", r);
//                     done();
//                 },
//                 function (r) {
//                     r.name = r.error; throw r;
//                     done();
//                 }
//             );
//         });
//     });

// });

describe("Transaction signing", function () {

    // sign tx with private key
    it("sign raw transaction using private key", function () {
        var tx = new EthTx({
            nonce: "00",
            gasPrice: "09184e72a000", 
            gasLimit: "2710",
            to: "0000000000000000000000000000000000000000", 
            value: "00", 
            data: "7f7465737432000000000000000000000000000000000000000000000000000000600057"
        });
        tx.sign(privateKey);
        var signed = "f889808609184e72a00082271094000000000000000000000000000000000000"+
                     "000080a47f746573743200000000000000000000000000000000000000000000"+
                     "0000000000600057";

        // RLP serialization
        var serializedTx = tx.serialize().toString("hex");
        assert.strictEqual(serializedTx.slice(0, 144), signed);
        assert.strictEqual(serializedTx.length, 278);
    });

    // create a new contract
    it("transaction to create a new contract", function () {
        var tx = new EthTx();
        tx.nonce = 0;
        tx.gasPrice = 100;
        tx.gasLimit = 1000;
        tx.value = 0;
        tx.data = "7f4e616d65526567000000000000000000000000000000000000000000000000"+
                  "003057307f4e616d655265670000000000000000000000000000000000000000"+
                  "0000000000573360455760415160566000396000f20036602259604556330e0f"+
                  "600f5933ff33560f601e5960003356576000335700604158600035560f602b59"+
                  "0033560f60365960003356573360003557600035335700";
        tx.sign(privateKey);
        var signed = "f8e380648203e88080b8977f4e616d6552656700000000000000000000000000"+
                     "0000000000000000000000003057307f4e616d65526567000000000000000000"+
                     "00000000000000000000000000000000573360455760415160566000396000f2"+
                     "0036602259604556330e0f600f5933ff33560f601e5960003356576000335700"+
                     "604158600035560f602b590033560f6036596000335657336000355760003533"+
                     "5700";
        var serializedTx = tx.serialize().toString("hex");
        assert.strictEqual(serializedTx.slice(0, 324), signed);
        assert.strictEqual(serializedTx.length, 458)
    });

    // up-front cost calculation:
    // fee = data length in bytes * 5
    //     + 500 Default transaction fee
    //     + gasAmount * gasPrice
    it("calculate up-front transaction cost", function () {
        var tx = new EthTx();
        tx.nonce = 0;
        tx.gasPrice = 100;
        tx.gasLimit = 1000;
        tx.value = 0;
        tx.data = "7f4e616d65526567000000000000000000000000000000000000000000000000"+
                  "003057307f4e616d655265670000000000000000000000000000000000000000"+
                  "0000000000573360455760415160566000396000f20036602259604556330e0f"+
                  "600f5933ff33560f601e5960003356576000335700604158600035560f602b59"+
                  "0033560f60365960003356573360003557600035335700";
        tx.sign(privateKey);
        assert.strictEqual(tx.getUpfrontCost().toString(), "100000");
    });

    // decode incoming tx using rlp: rlp.decode(itx)
    // (also need to check sender's account to see if they have at least amount of the fee)
    it("should verify sender's signature", function () {
        var rawTx = [
            "00",
            "09184e72a000",
            "2710",
            "0000000000000000000000000000000000000000",
            "00",
            "7f7465737432000000000000000000000000000000000000000000000000000000600057",
            "1c",
            "5e1d3a76fbf824220eafc8c79ad578ad2b67d01b0c2425eb1f1347e8f50882ab",
            "5bd428537f05f9830e93792f90ea6a3e2d1ee84952dd96edbae9f658f831ab13"
        ];
        var tx2 = new EthTx(rawTx);
        var sender = "1f36f546477cda21bf2296c50976f2740247906f";
        assert.strictEqual(tx2.getSenderAddress().toString("hex"), sender);
        assert(tx2.verifySignature());
    });

});

describe("Contract methods", function () {

    describe("Call", function () {

        it("call getBranches using web.invoke", function (done) {
            this.timeout(constants.TIMEOUT);
            augur.web.login(handle, password, function (user) {
                if (user.error) {
                    augur.web.logout(); done(user);
                } else {

                    // sync
                    var branches = augur.web.invoke(augur.tx.getBranches);
                    assert(branches.length);
                    assert.strictEqual(branches.constructor, Array);
                    assert.strictEqual(
                        augur.encode_result(branches[0], augur.tx.getBranches.returns),
                        augur.branches.dev
                    );

                    // async
                    augur.web.invoke(augur.tx.getBranches, function (branches) {
                        assert(branches.length);
                        assert.strictEqual(branches.constructor, Array);
                        assert.strictEqual(
                            augur.encode_result(branches[0], augur.tx.getBranches.returns),
                            augur.branches.dev
                        );
                        augur.web.logout();
                        done();
                    });
                }
            });
        });

    });

    describe("Send transaction", function () {

        it("detect logged in user and default to web.invoke", function (done) {
            this.timeout(constants.TIMEOUT);
            augur.web.login(handle, password, function (user) {
                if (user.error) {
                    augur.web.logout(); done(user);
                } else {
                    assert.strictEqual(user.address, augur.web.account.address);
                    augur.reputationFaucet(
                        augur.branches.dev,
                        function (r) {
                            // sent
                            assert(r.txHash);
                            assert.strictEqual(r.callReturn, "1");
                        },
                        function (r) {
                            // success
                            assert.strictEqual(r.from, augur.web.account.address);
                            assert.strictEqual(r.from, user.address);
                            assert(r.blockHash);
                            augur.web.logout();
                            done();
                        },
                        function (r) {
                            // failed
                            augur.web.logout();
                            done(r);
                        }
                    );
                }
            });
        });

        it("sign and send transaction using account 1", function (done) {
            this.timeout(constants.TIMEOUT);
            augur.web.login(handle, password, function (user) {
                if (user.error) {
                    augur.web.logout(); done(user);
                } else {
                    var tx = utils.copy(augur.tx.reputationFaucet);
                    tx.params = augur.branches.dev;
                    augur.web.invoke(tx, function (txhash) {
                        if (txhash.error) {
                            augur.web.logout(); done(txhash);
                        } else {
                            assert(txhash);
                            augur.getTx(txhash, function (confirmTx) {
                                if (confirmTx.error) {
                                    augur.web.logout(); done(confirmTx);
                                } else {
                                    assert(confirmTx.hash);
                                    assert(confirmTx.from);
                                    assert(confirmTx.to);
                                    assert.strictEqual(txhash, confirmTx.hash);
                                    assert.strictEqual(confirmTx.from, user.address);
                                    assert.strictEqual(confirmTx.to, tx.to);
                                    augur.web.logout();
                                    done();
                                }
                            });
                        }
                    });
                }
            });
        });

    });
});