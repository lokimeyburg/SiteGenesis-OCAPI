"use strict";
var category = require("./../helpers/category.js");
var product = require("./../helpers/product.js");
var cart = require("./../helpers/cart.js");
var Promise = require('bluebird');

module.exports = function(app) {

    //Show CLP page
    app.get('/', function(req, res) {
        category.getOnlineCategories("root").then(function(categories) {
            req.session.categories = categories;
            res.render('index', {
                'categories': categories
            });
        }).catch(function(error) {
            console.log(error);
        });
    });

    //Show CLP page for a particular category id
    app.get('/SearchShow', function(req, res) {

        var cgid = req.query.cgid;
        console.log("cgid: " + cgid);

        Promise.all([category.getOnlineCategories(cgid), category.getCategoryObject(cgid), category.getProductsAssignedToCategory(cgid)])
            .spread(function(categories, categoryObject, productHits) {
                var categoriesFound;
                if (categories.length > 0) {
                    categoriesFound = categories;
                    req.session.categories = categoriesFound;
                } else { //Handle case when end of category level is reached
                    categoriesFound = req.session.categories;
                }
                res.render('index', {
                    'categories': categoriesFound,
                    'products': productHits,
                    'selectedCategory': cgid,
                    'selectedCategoryName': categoryObject.name,
                    'parentCategoryId': categoryObject.parentCategoryId,
                    'catBannerImageSrc': categoryObject.catBannerImageSrc
                });
            }).catch(function(error) {
                console.log(error);
            });
    });


    //Show PDP page
    app.get('/ProductShow', function(req, res) {

        var pid = req.query.pid;

        Promise.all([category.getOnlineCategories('root'), product.getProductObject(pid)])
            .spread(function(categories, productObject) {

                var variantsArray = product.getVariantValues(productObject[1]);
                var imageObject = product.getProductImages(productObject[0]);

                res.render('single', {
                    'product': productObject[0],
                    'colorVariants': variantsArray[2],
                    'sizeVariants': variantsArray[1],
                    'categories': categories,
                    'images': imageObject,
                    'variants': variantsArray[0]
                });
            }).catch(function(error) {
                console.log(error);
            });
    });

    //Add product to basket
    app.post('/addProductToBasket', function(req, res) {

        var productObject = {};
        productObject.product_id = req.body.product_id;
        productObject.quantity = req.body.quantity;

        //Create basket & add product to cart
        cart.createBasket(req).then(function() {
            cart.addProductToBasket(productObject, req).then(function() {
                res.setHeader('Content-Type', 'application/json');
                res.send(JSON.stringify({
                    "success": "Product Successfully add in cart"
                }));

            }).catch(function(error) {
                res.setHeader('Content-Type', 'application/json');
                res.send(JSON.stringify({
                    "error": error
                }));
                console.log(error);
            });
        });
    });

    //Show Cart Page
    app.get('/CartShow', function(req, res) {

        var action = req.query.action;

        //If action is 'remove', delete product from Cart
        if (action === 'remove') {

            cart.removeProductFromBasket(req).then(function(basket) {
                return cart.getBasketObject(basket);
            }).then(function(basketObj) {
                res.render('cart', {
                    basket: basketObj,
                    products: basketObj.products
                });
            }).catch(function(error) {
                console.log(error);
            });

        } else { //Display Cart Page
            cart.getBasket(req).then(function(basket) {
                return cart.getBasketObject(JSON.parse(basket));
            }).then(function(basketObj) {
                res.render('cart', {
                    basket: basketObj,
                    products: basketObj.products
                });
            }).catch(function(error) {
                console.log(error);
            });
        }

    });


    //Show Shipping Address Page
    app.get('/Shipping', function(req, res) {

        cart.getBasket(req).then(function(basket) {
            return cart.getBasketObject(JSON.parse(basket));
        }).then(function(basketObj) {
            res.render('shipping', {
                basket: basketObj
            });
        }).catch(function(error) {
            console.log(error);
        });
    });

    //Show Billing Page
    app.post('/Billing', function(req, res) {

        cart.getBasket(req).then(function(basket) {
            //Update basket with customer email
            return cart.updateBasket(req);
        }).then(function() {
            //Update default shipment with address
            return cart.updateDefaultShipment(req);
        }).then(function(basket) {
            return cart.getBasketObject(basket);
        }).then(function(basketObj) {
            res.render('billing', {
                basket: basketObj
            });
        }).catch(function(error) {
            console.log(error);
        });
    });

    //Show Payment Section
    app.post('/Payment', function(req, res) {

        cart.getBasket(req).then(function(basket) {
            //Update basket with billing address
            return cart.createBillingAddress(req);
        }).then(function(basket) {
            return cart.getBasketObject(basket);
        }).then(function(basketObj) {
            res.render('payment', {
                basket: basketObj
            });
        }).catch(function(error) {
            console.log(error);
        });
    });

    //Place Order
    app.post('/Submit', function(req, res) {

        cart.getBasket(req).then(function(basket) {
            //Add payment instrument to basket
            return cart.createBasketPaymentInstrument(req, basket);
        }).then(function() {
            //Place order call
            return cart.placeOrder(req);
        }).then(function(order) {
            res.render('confirmation', {
                order: order
            });
        }).catch(function(error) {
            console.log(error);
        });
    });

};
