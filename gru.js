// gru.js
export class GRUModel {
    constructor(sequenceLength = 60, numFeatures = 1, predictionDays = 5) {
        console.log('GRUModel initialized');
        this.sequenceLength = sequenceLength;
        this.numFeatures = numFeatures;
        this.predictionDays = predictionDays;
        this.model = null;
        this.history = null;
        this.isTrained = false;
        this.trainingLogs = [];
        
        // Training configuration
        this.config = {
            epochs: 20,
            batchSize: 32,
            validationSplit: 0.2,
            learningRate: 0.001
        };
    }

    /**
     * Build and compile the GRU model
     */
    buildModel() {
        console.log('Building GRU model...');
        
        // Clear existing model
        if (this.model) {
            this.model.dispose();
        }
        
        try {
            this.model = tf.sequential();
            
            // GRU layer
            this.model.add(tf.layers.gru({
                units: 32,
                returnSequences: false,
                activation: 'tanh',
                inputShape: [this.numFeatures, this.sequenceLength]
            }));
            
            // Dropout for regularization
            this.model.add(tf.layers.dropout({rate: 0.2}));
            
            // Dense layer
            this.model.add(tf.layers.dense({
                units: 16,
                activation: 'relu'
            }));
            
            // Output layer
            this.model.add(tf.layers.dense({
                units: this.predictionDays,
                activation: 'sigmoid'
            }));
            
            // Compile model
            const optimizer = tf.train.adam(this.config.learningRate);
            this.model.compile({
                optimizer: optimizer,
                loss: 'binaryCrossentropy',
                metrics: ['accuracy']
            });
            
            console.log('✅ GRU model built successfully');
            
            // Print model summary
            const totalParams = this.model.countParams();
            console.log('Total parameters:', totalParams.toLocaleString());
            
            return this.model;
            
        } catch (error) {
            console.error('Error building model:', error);
            throw error;
        }
    }

    /**
     * Train the model
     */
    async train(X_train, y_train, onEpochEnd = null) {
        console.log('Starting model training...');
        
        if (!this.model) {
            throw new Error('Model not built. Call buildModel first.');
        }
        
        console.log('Training data shape:',
