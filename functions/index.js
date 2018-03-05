// The Cloud Functions for Firebase SDK to create Cloud Functions and setup triggers.
const functions = require('firebase-functions');
const fs = require('fs');
const firebase = require('firebase');
const googleStorage = require('@google-cloud/storage');
const Json2csvParser = require('json2csv').Parser;
const builder = require('xmlbuilder');
const request = require('request');
// The Firebase Admin SDK to access the Firebase Realtime Database.
const admin = require('firebase-admin');
admin.initializeApp(functions.config().firebase);

let config = {
    apiKey: "AIzaSyDraW73UL6CzSSn15J8tLJQkJNADjVb9cM",
    authDomain: "sku-creator.firebaseapp.com",
    databaseURL: "https://sku-creator.firebaseio.com",
    projectId: "sku-creator",
    storageBucket: "sku-creator.appspot.com",
    messagingSenderId: "540346218345"
};
firebase.initializeApp(config);

const storage = googleStorage({
    projectId: "sku-creator",
    keyFilename: "./service-account.json"
});
const bucket = storage.bucket(config.storageBucket);

let androidCSVHeader = ['Product ID','Published State','Purchase Type','Auto Translate','Locale', 'Title', 'Description','Auto Fill Prices','Price'];

let products = {};

products.index = function (){

    let userRef = firebase.database().ref('users');
    userRef.on('value',function (snapshot) {
        snapshot.forEach(function (childSnapshot) {
            let userID = childSnapshot.key;
            let childProducts = childSnapshot.val().products;
            let androidArr = [];
            let iosArr = [];
            let count = 0;
            let i;
            for(i in childProducts){
                count++;
                if (childProducts[i].hasOwnProperty('android') && childProducts[i].hasOwnProperty('ios')) {
                    let android = {
                        "Product ID":(childProducts[i].hasOwnProperty('product_id')) ? childProducts[i].project_id : '',
                        "Locale":(childProducts[i].hasOwnProperty('locale')) ? childProducts[i].locale : '',
                        "Title":(childProducts[i].hasOwnProperty('title')) ? childProducts[i].title : '',
                        "Description":(childProducts[i].hasOwnProperty('description')) ? childProducts[i].description : ''
                    };
                    let ios = {
                        product_id:(childProducts[i].hasOwnProperty('product_id')) ? childProducts[i].project_id : '',
                        locale:(childProducts[i].hasOwnProperty('locale')) ? childProducts[i].locale : '',
                        title:(childProducts[i].hasOwnProperty('title')) ? childProducts[i].title : '',
                        description:(childProducts[i].hasOwnProperty('description')) ? childProducts[i].description : ''
                    };
                    android = Object.assign({}, childProducts[i].android, android);
                    ios = Object.assign({}, childProducts[i].ios, ios);
                    androidArr.push(android);
                    iosArr.push(ios);

                }
                if (count === Object.keys(childProducts).length) {
                    if(androidArr.length > 0){
                        products.createCSV(androidArr,userID+'.csv',function (response) {
                            if (response.statusCode === 200){
                                if (response.statusCode === 200){
                                    firebase.database().ref('users/'+userID).child('urls').update({
                                        "android": response.url
                                    });
                                }
                            }
                        });
                    }
                    if (iosArr.length > 0) {
                        products.createXML(iosArr,userID+'.xml',function (response) {
                            if (response.statusCode === 200){
                                firebase.database().ref('users/'+userID).child('urls').update({
                                    "ios": response.url
                                });
                            }
                        });
                    }
                }
            }
        });
    });
};

//for android
products.createCSV = function (array,filename,callback){
    const json2csvParser = new Json2csvParser({ androidCSVHeader });
    const csv = json2csvParser.parse(array);
    products.uploadFileToBucket(filename,csv,function (response) {
        callback(response);
    });
}

//for ios
products.createXML = function (array,filename,callback) {

    let builderList = builder.create('package')
        .dec('1.0', 'UTF-8')
        .att('xmlns', 'http://apple.com/itunes/importer')
        .att('version', 'software5.4')
        .att('generator', 'ITunesPackage')
        .att('generator_version', '1.1 (1034)')
        .ele('metadata_token','1505199400615-f7dd9eec802f9b38844f3fc1389b56d5a24ded91c776a7dae49cfc8851cd6a0c').up()
        .ele('provider','4ZN77E3Y6X').up()
        .ele('team_id','4ZN77E3Y6X').up()
        .ele('software')
            .ele('vendor_id','com.absentiavr.iaptest').up()
            .ele('read_only_info')
                .ele('read_only_value',{'key': 'apple-id'}, '1281873266').up()
            .up()
            .ele('software_metadata',{'app_platform': 'ios'})
                .ele('versions')
                    .ele('version',{'string': '1.0'})
                        .ele('locales')
                            .ele('locale',{'name': 'en-US'})
                                .ele('title','iAPTest-AbsentiaVR').up()
                            .up()
                        .up()
                    .up()
                .up()
                .ele('in_app_purchases');
    array.forEach((value,key) => {
        builderList.ele('in_app_purchase')
                    .ele('locales')
                        .ele('locale',{'name': value.locale})
                            .ele('title',value.title).up()
                            .ele('description',value.description).up()
                        .up()
                    .up()
                    .ele('product_id',value.product_id).up()
                    .ele('reference_name',(value.hasOwnProperty('reference_name')) ? value.reference_name : '').up()
                    .ele('type',(value.hasOwnProperty('type')) ? value.type : '').up()
                    .ele('products')
                        .ele('product')
                            .ele('cleared_for_sale',(value.hasOwnProperty('cleared_for_sale')) ? value.cleared_for_sale : '').up()
                            .ele('intervals')
                                .ele('interval')
                                    .ele('start_date',(value.hasOwnProperty('start_date')) ? value.start_date : '').up()
                                    .ele('wholesale_price_tier',(value.hasOwnProperty('wholesale_price_tier')) ? value.wholesale_price_tier : '').up()
                                .up()
                            .up()
                        .up()
                    .up()
    });
    builderList.up();
    let xml = builderList.end({pretty: true});
    products.uploadFileToBucket(filename,xml,function (response) {
        callback(response);
    });
}

products.uploadFileToBucket = function(filename,data,callback){

    let gcsStream = bucket.file(filename).createWriteStream();

    gcsStream.write( data);
    gcsStream.on('error', (err) => {
        console.error(`${ this.archive }: Error storage file write.`);
        console.error(`${ this.archive }: ${JSON.stringify(err)}`);
    });
    gcsStream.on('finish', () => {
        callback({statusCode:200,url:`https://storage.googleapis.com/${config.storageBucket}/${filename}`});
    });
    gcsStream.end();
}
// Listens for new messages added to /messages/:pushId/original and creates an
// uppercase version of the message to /messages/:pushId/uppercase
exports.eventonWrite = functions.database.ref('/users/{userUID}/products').onWrite((event) => {
    products.index();
    return true;
});



