Use replit.md to refer to design choices aesthetically
    Plan to refactor:
        Refactoring: I'm not experienced with react native development, but set up the repository in a manner thats easily navigable and extensible for adding our AI features/backend/database work down the line 
        Reminder: Codex will review your outputs
        General Design: This app is intended to provide symptom tracking and diagnoses for malaria in low income areas
        where internet access may not be guaranteed, this will involve a small LLM & CV model which can diagnose based 
        on symptoms or blood smears.
    Pages:
        - Dashboard for current patients 
            + Make another page where if you click on patients specifically you can track symptoms individually
            + Send alerts based on time, like if a user is classified as high % probability of malaria, it should alert 
              the user
        - Questionaire Page
          + Includes the form which is questions along with (optional) image upload for physical symptom appearance or 
        - Status Management of Patients (Locally)
            + The information should be stored locally, with the option to sync to the cloud if they have connectivity 
          + Should be updatable 
          + Reference questionaire.md for the specifics of what questions to include
        - Chatbot Page & Doctor Chat Page:
          + Have access via MCP? to the other fields of the app, and will store the WHO guidelines chunked locally for 
          it's responses
          + Should be a page where users can chat with a medical professional via Satellite connection if there is no internet connection

        Core Features: 
            - Questionaire initially will go through the symptoms, and it will be updated periodically to track the 
              progression
            - Questionaire will include option for image uploads of blood smears or topical symptoms on skin as well
            - For evaluation, we will have a small LLM such as Gemma and a lite CV model that uses RAG of WHO guidelines 
              for evaluation
                + When there is no online access it will default to these smaller models
                + When there is online access it should be able to use API calls to our larger model(s) for evaluation which have more reasoning capability
            - There should be a time series aspect to the questionnaire in which the user updates the patient's 
              information, as accurate diagnoses depend on analyzing the behavior over time and determining if they are
              in a cycle that Malaria causes
            - There should be a page for a chatbot in which they can describe this in natural language and it should     
              have access to the APIs of other pages  
            - Chat should have option to connect to Twillio or some service where users could potentially escalate the 
              communication via satellite to receive professional help if issues escalate 
    