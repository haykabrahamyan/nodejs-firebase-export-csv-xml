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
let outputCSV = 'output.csv';
let outputXML = 'output.xml';

let androidCSVHeader = ['Product ID','Published State','Purchase Type','Auto Translate','Locale', 'Title', 'Description','Auto Fill Prices','Price'];

let products = {};

products.index = function (){

    let userId = '31ybhIMtJIWHCaa5maRPUUTsey23';
    let androidArr = [];
    let iosArr = [];
    let ref = firebase.database().ref('/users/' + userId);
    let count = 0;
    ref.child('products').on('value',(snapshot) => {
        snapshot.forEach((value) => {
            let android = {"Product ID":value.val().product_id,"Locale":value.val().locale,"Title":value.val().title,"Description":value.val().description};
            let ios = {product_id:value.val().product_id,locale:value.val().locale,title:value.val().title,description:value.val().description};
            android = Object.assign({}, value.val().android, android);
            ios = Object.assign({}, value.val().ios, ios);
            androidArr.push(android);
            iosArr.push(ios);
            count++;
            if (count === snapshot.numChildren()) {
                if(androidArr.length > 0){
                    products.createCSV(androidArr,outputCSV,(response) => {
                        if (response.statusCode === 200){
                            products.uploadFileToBucket(outputCSV,response.data,(res) => {
                                if (res.statusCode === 200){
                                    ref.child('urls').update({
                                        "android": res.url
                                    });
                                }

                            });
                        }
                    });
                }
                if (iosArr.length > 0) {
                    products.createXML(iosArr,outputXML,(response) => {
                        if (response.statusCode === 200){
                            products.uploadFileToBucket(outputXML,response.data,(res) => {
                                if (res.statusCode === 200) {
                                    ref.child('urls').update({
                                        "ios": res.url
                                    });
                                }
                            });
                        }
                    });
                }
            }
        });
    });
};

//for android
products.createCSV = function (array,filename,callback){
    const json2csvParser = new Json2csvParser({ androidCSVHeader });
    const csv = json2csvParser.parse(array);
    callback({statusCode:200,data:csv});

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
                    .ele('reference_name',value.reference_name).up()
                    .ele('type',value.type).up()
                    .ele('products')
                        .ele('product')
                            .ele('cleared_for_sale',value.cleared_for_sale).up()
                            .ele('intervals')
                                .ele('interval')
                                    .ele('start_date',value.start_date).up()
                                    .ele('wholesale_price_tier',value.wholesale_price_tier).up()
                                .up()
                            .up()
                        .up()
                    .up()
    });
    builderList.up();
    let xml = builderList.end({pretty: true});
    callback({statusCode:200,data:xml});
}

products.uploadFileToBucket = function(filename,data,callback){

    let gcsStream = bucket.file(filename).createWriteStream();

    gcsStream.write( data);
    gcsStream.on('error', (err) => {
        console.error(`${ this.archive }: Error storage file write.`);
        console.error(`${ this.archive }: ${JSON.stringify(err)}`);
    });
    gcsStream.on('finish', () => {
        callback({statusCode:200,url:`gs://${config.storageBucket}/${filename}`});
    });
    gcsStream.end();
}
// Listens for new messages added to /messages/:pushId/original and creates an
// uppercase version of the message to /messages/:pushId/uppercase
exports.eventonWrite = functions.database.ref('/users/{userUID}/products').onWrite((event) => {
    products.index();
    return true;
});



