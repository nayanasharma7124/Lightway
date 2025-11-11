
//index.js file

/////////////////////////////////////////////////////////////////////////////////
// In this section, we set the user authentication, app ID, workflow ID, and  
// image URL. Change these strings to run your own example.
////////////////////////////////////////////////////////////////////////////////

const USER_ID = 'belhyto';
// Your PAT (Personal Access Token) can be found in the Account's Security section
const PAT = '70db6f5db2e34772ac8fa8da1e8f7b85';
const APP_ID = 'lightway';
// Change these to make your own predictions
const WORKFLOW_ID = 'workflow-e7aa07';
const IMAGE_URL = 'https://samples.clarifai.com/metro-north.jpg';

/////////////////////////////////////////////////////////////////////////////
// YOU DO NOT NEED TO CHANGE ANYTHING BELOW THIS LINE TO RUN THIS EXAMPLE
/////////////////////////////////////////////////////////////////////////////

const { ClarifaiStub, grpc } = require("clarifai-nodejs-grpc");

const stub = ClarifaiStub.grpc();

// This will be used by every Clarifai endpoint call
const metadata = new grpc.Metadata();
metadata.set("authorization", "Key " + PAT);

stub.PostWorkflowResults(
    {
        user_app_id: {
            "user_id": USER_ID,
            "app_id": APP_ID
        },
        workflow_id: WORKFLOW_ID,
        inputs: [
            { data: { image: { url: IMAGE_URL } } }
        ]
    },
    metadata,
    (err, response) => {
        if (err) {
            throw new Error(err);
        }

        if (response.status.code !== 10000) {
            throw new Error("Post workflow results failed, status: " + response.status.description);
        }

        // We'll get one WorkflowResult for each input we used above. Because of one input, we have here
        // one WorkflowResult.
        const results = response.results[0];

        // Each model we have in the workflow will produce one output.
        for (const output of results.outputs) {
            const model = output.model;

            console.log("Predicted concepts for the model `" + model.id + "`:");
            for (const concept of output.data.concepts) {
                console.log("\t" + concept.name + " " + concept.value);
            }
        }
    }
);
