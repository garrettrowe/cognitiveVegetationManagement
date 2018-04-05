# Cognitive Vegetation Optimization

Grid Resiliency starts with a Cognitive approach to tree management. North American Consumers are demanding higher levels of service from a power reliability and power quality. The DOE from a 2014 Campbell report estimates that Sustained and Momentary interruptions has an $80 billion economic impact annually. Vegetation based power interruptions have up to a 70% impact on annual SAIDI, CAIDI, and MAIFI. In this demo we look at how IBM Watson can help Energy and Utilitie companies manage dangerous vegetation along their powerline right-of-way by automatically identifying problem foliage. Use the navigational controls to move the map, and the slider to control the vegetation trigger level.  

[Watson Visual Recognition](https://www.ibm.com/watson/services/visual-recognition) powers this solution.  Visual Recognition understands the contents of images. Analyze images for scenes, objects, faces, colors, food, text, explicit content and other subjects that can give you insights into your visual content. Customize Watson perfectly for your unique use case. With only a few images, Watson can learn any new object, person, or attribute.

See this demo live here:  https://vegetationmanagement.mybluemix.net/

### Reference/Docs

* [Node.js on IBM Bluemix](https://console.ng.bluemix.net/catalog/starters/sdk-for-nodejs/)
* [Watson Visual Recognition API Reference](https://www.ibm.com/watson/developercloud/visual-recognition/api/v3/)
* [Watson Visual Recognition Custom Classifiers](https://www.ibm.com/watson/developercloud/visual-recognition/api/v3/#classifiers)
* [Best Practices Creating Custom Classifiers](https://www.ibm.com/blogs/bluemix/2016/10/watson-visual-recognition-training-best-practices/)
* [Visual-Recognition-Tile-Localization](https://github.com/IBM-Cloud/Visual-Recognition-Tile-Localization)


### Train your own Watson Visual Recognition Model

* There are two zip files in this repository.  Once you have provisioned Watson Visual Recognition, you can train a model using these with the following command:

curl -X POST --form "veg_positive_examples=@yes.zip" --form "negative_examples=@no.zip" --form "name=veg" "https://gateway-a.watsonplatform.net/visual-recognition/api/v3/classifiers?api_key={yourKeyHere}&version=2016-05-20"

* Check on the training status using this command:

curl -X GET "https://gateway-a.watsonplatform.net/visual-recognition/api/v3/classifiers/{yourModelId}?api_key={yourKeyHere}&version=2016-05-20"

### Run the app locally

1. [Install Node.js][install_node]
2. Download the code
3. Edit `app.js` and add your Watson Visual Recognition Key and Customer Classifier ID
4. cd into the app directory
5. Run `npm install` to install the app's dependencies
6. Run `npm start` to start the app
7. Access the running app in a browser at http://localhost:6001

### Run on IBM Bluemix

The app will also run as-is (with Watson key and classifier id) in the default [Node.js buildpack on Bluemix][node_bluemix].  Once you have modified `app.js` and updated the `WATSON_KEY` and `WATSON_CLASSIFIER` values, then you can deploy using the [Bluemix CLI][bluemix_cli] `push` command. 

### Privacy Notice

The sample web application includes code to track deployments to Bluemix and other Cloud Foundry platforms. The following information is sent to a [Deployment Tracker] [deploy_track_url] service on each deployment:

* Application Name (`application_name`)
* Space ID (`space_id`)
* Application Version (`application_version`)
* Application URIs (`application_uris`)

This data is collected from the `VCAP_APPLICATION` environment variable in IBM Bluemix and other Cloud Foundry platforms. This data is used by IBM to track metrics around deployments of sample applications to IBM Bluemix. Only deployments of sample applications that include code to ping the Deployment Tracker service will be tracked.

### Disabling Deployment Tracking

Deployment tracking can be disabled by removing `require("cf-deployment-tracker-client").track();` from the `app.js` main server file.

[deploy_track_url]: https://github.com/cloudant-labs/deployment-tracker
[install_node]: https://nodejs.org/en/download/
[node_bluemix]: https://console.ng.bluemix.net/catalog/starters/sdk-for-nodejs/
[bluemix_cli]: https://console.ng.bluemix.net/docs/cli/reference/bluemix_cli/index.html

