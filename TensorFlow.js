# Required Libraries
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.decomposition import PCA
import tensorflow as tf
import tensorflowjs as tfjs

# Load Dataset
data = pd.read_csv('dataset_full.csv')  # Replace with your dataset path

# Preprocessing
X = data.drop(columns=["phishing"])
y = data["phishing"]
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)

# Dimensional Reduction using PCA
pca = PCA(n_components=20)  # Retain 20 components
X_reduced = pca.fit_transform(X_scaled)

# Split Dataset
X_train, X_test, y_train, y_test = train_test_split(X_reduced, y, test_size=0.2, random_state=42)

# TensorFlow Model
model = tf.keras.Sequential([
    tf.keras.layers.Dense(64, activation='relu', input_shape=(X_train.shape[1],)),
    tf.keras.layers.Dense(32, activation='relu'),
    tf.keras.layers.Dense(1, activation='sigmoid')
])
model.compile(optimizer='adam', loss='binary_crossentropy', metrics=['accuracy'])

# Train Model
model.fit(X_train, y_train, epochs=10, batch_size=32, validation_split=0.2)

# Save Model in TensorFlow.js Format
tfjs.converters.save_keras_model(model, 'phishing_model')
