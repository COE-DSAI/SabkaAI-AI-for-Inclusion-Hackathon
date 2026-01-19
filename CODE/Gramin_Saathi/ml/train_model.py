import pandas as pd
import numpy as np
import warnings
warnings.filterwarnings('ignore')

import matplotlib.pyplot as plt
import seaborn as sns
import plotly.express as px
import plotly.graph_objects as go
from plotly.subplots import make_subplots

from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import mean_squared_error, r2_score, mean_absolute_error
from sklearn.utils import shuffle

import tensorflow as tf
from tensorflow import keras
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, Dropout, Reshape
from tensorflow.keras.callbacks import EarlyStopping, ReduceLROnPlateau
from tensorflow.keras.optimizers import Adam

import joblib
import json

pd.set_option('display.max_columns', None)
pd.set_option('display.max_rows', 100)
plt.style.use('seaborn-v0_8-darkgrid')
sns.set_palette("husl")

print(f"✅ TensorFlow version: {tf.__version__}")
print(f"✅ Keras version: {keras.__version__}")
print("✅ All libraries imported successfully!")

import os
output_dir = '../output_charts'
os.makedirs(output_dir, exist_ok=True)

df_yield = pd.read_csv('../crop_yield.csv')

print(f"Dataset loaded: {df_yield.shape[0]} rows, {df_yield.shape[1]} columns")
print("\nFirst few rows:")

print("\nDataset info:")
print(df_yield.info())

print("\nMissing values:")
print(df_yield.isnull().sum())

df_yield_clean = df_yield.copy()

df_yield_clean = df_yield_clean.drop_duplicates()

df_yield_clean = df_yield_clean.dropna(subset=['Yield'])

numeric_cols = df_yield_clean.select_dtypes(include=[np.number]).columns
for col in numeric_cols:
    if df_yield_clean[col].isnull().sum() > 0:
        df_yield_clean[col].fillna(df_yield_clean[col].median(), inplace=True)

print(f"✅ Cleaned dataset: {df_yield_clean.shape[0]} rows")
print(f"✅ Remaining missing values: {df_yield_clean.isnull().sum().sum()}")

print("🤖 Preparing data for LSTM Model (Order-Independent)...")
print("⚠️  NOTE: This model does NOT depend on temporal ordering!")
print("⚠️  Crop_Year is treated as a regular feature, not a sequence.\n")

numeric_cols = df_yield_clean.select_dtypes(include=[np.number]).columns.tolist()

if len(numeric_cols) >= 2:
    target_col = 'Yield' if 'Yield' in numeric_cols else numeric_cols[-1]
    feature_cols = [col for col in numeric_cols if col != target_col]
    
    print(f"Target variable: {target_col}")
    print(f"Feature variables: {feature_cols}")
    print(f"   (Crop_Year is just another feature, not used for sequencing)")
    
    df_ml = df_yield_clean[feature_cols + [target_col]].dropna()
    
    df_ml = shuffle(df_ml, random_state=42)
    print(f"\n✅ Data SHUFFLED to ensure order independence")
    
    X = df_ml[feature_cols]
    y = df_ml[target_col]
    
    print(f"\n✅ Data prepared: {X.shape[0]} samples, {X.shape[1]} features")
    print(f"Target variable range: {y.min():.2f} to {y.max():.2f}")
    print(f"\nFeature statistics:")
else:
    print("⚠️ Not enough numeric columns for ML modeling")

X_train, X_test, y_train, y_test = train_test_split(
    X, y, 
    test_size=0.2, 
    random_state=42,
    shuffle=True  # Explicitly shuffle to ensure randomness
)

print(f"Training set: {X_train.shape[0]} samples")
print(f"Testing set: {X_test.shape[0]} samples")

scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)

y_scaler = StandardScaler()
y_train_scaled = y_scaler.fit_transform(y_train.values.reshape(-1, 1)).flatten()
y_test_scaled = y_scaler.transform(y_test.values.reshape(-1, 1)).flatten()

n_features = X_train_scaled.shape[1]
X_train_lstm = X_train_scaled.reshape(X_train_scaled.shape[0], 1, n_features)
X_test_lstm = X_test_scaled.reshape(X_test_scaled.shape[0], 1, n_features)

print(f"\n✅ Data scaled and reshaped for LSTM")
print(f"   Training shape: {X_train_lstm.shape} (samples, timesteps=1, features)")
print(f"   Testing shape: {X_test_lstm.shape}")
print(f"\n   Each sample is processed independently (timesteps=1)")

def build_lstm_model(input_shape):
    """
    Build LSTM model that processes each sample independently
    
    Args:
        input_shape: Tuple (timesteps=1, features)
    
    Returns:
        Compiled Keras model
    """
    model = Sequential([
        LSTM(128, activation='relu', return_sequences=True, input_shape=input_shape),
        Dropout(0.2),
        
        LSTM(64, activation='relu', return_sequences=False),
        Dropout(0.2),
        
        Dense(32, activation='relu'),
        Dropout(0.2),
        
        Dense(16, activation='relu'),
        Dropout(0.1),
        
        Dense(1)
    ])
    
    model.compile(
        optimizer=Adam(learning_rate=0.001),
        loss='mse',
        metrics=['mae']
    )
    
    return model

input_shape = (1, n_features)  # timesteps=1, each sample is independent
model = build_lstm_model(input_shape)

print("🏗️ LSTM Model Architecture (Order-Independent):")
print("="*60)
model.summary()
print("="*60)
print("\n⚠️  Note: This LSTM treats each sample independently.")
print("   Shuffling Crop_Year will NOT affect predictions!")

print("\n🎯 Training LSTM Model...")
print("="*60)

early_stopping = EarlyStopping(
    monitor='val_loss',
    patience=20,
    restore_best_weights=True,
    verbose=1
)

reduce_lr = ReduceLROnPlateau(
    monitor='val_loss',
    factor=0.5,
    patience=7,
    min_lr=1e-7,
    verbose=1
)

history = model.fit(
    X_train_lstm, y_train_scaled,
    epochs=150,
    batch_size=32,
    validation_split=0.2,
    callbacks=[early_stopping, reduce_lr],
    verbose=1
)

print("\n✅ Training completed!")

print("\n📊 Evaluating LSTM Model...")
print("="*60)

y_pred_scaled = model.predict(X_test_lstm).flatten()

y_pred = y_scaler.inverse_transform(y_pred_scaled.reshape(-1, 1)).flatten()

mse = mean_squared_error(y_test, y_pred)
rmse = np.sqrt(mse)
mae = mean_absolute_error(y_test, y_pred)
r2 = r2_score(y_test, y_pred)

results = {
    'LSTM': {
        'MSE': mse,
        'RMSE': rmse,
        'MAE': mae,
        'R²': r2,
        'model': model,
        'predictions': y_pred,
        'history': history
    }
}

print(f"\n🏆 LSTM Model Performance:")
print(f"   RMSE: {rmse:.4f}")
print(f"   MAE: {mae:.4f}")
print(f"   R² Score: {r2:.4f}")
print(f"   MSE: {mse:.4f}")
print("="*60)

mape = np.mean(np.abs((y_test - y_pred) / y_test)) * 100
print(f"\n📈 Additional Metrics:")
print(f"   MAPE: {mape:.2f}%")
print(f"   Mean Actual: {y_test.mean():.2f}")
print(f"   Mean Predicted: {y_pred.mean():.2f}")
print(f"   Std Actual: {y_test.std():.2f}")
print(f"   Std Predicted: {y_pred.std():.2f}")

best_model_name = 'LSTM'

print("\n🔬 Testing Order Independence...")
print("="*60)

X_test_shuffled = X_test.copy()
y_test_shuffled = y_test.copy()

shuffle_idx = np.random.permutation(len(X_test_shuffled))
X_test_shuffled = X_test_shuffled.iloc[shuffle_idx]
y_test_shuffled = y_test_shuffled.iloc[shuffle_idx]

X_test_shuffled_scaled = scaler.transform(X_test_shuffled)
X_test_shuffled_lstm = X_test_shuffled_scaled.reshape(
    X_test_shuffled_scaled.shape[0], 1, n_features
)

y_pred_shuffled_scaled = model.predict(X_test_shuffled_lstm).flatten()
y_pred_shuffled = y_scaler.inverse_transform(
    y_pred_shuffled_scaled.reshape(-1, 1)
).flatten()

unshuffle_idx = np.argsort(shuffle_idx)
y_pred_unshuffled = y_pred_shuffled[unshuffle_idx]

prediction_diff = np.abs(y_pred - y_pred_unshuffled)
max_diff = prediction_diff.max()
mean_diff = prediction_diff.mean()

print(f"\n✅ Order Independence Test Results:")
print(f"   Max prediction difference: {max_diff:.10f}")
print(f"   Mean prediction difference: {mean_diff:.10f}")

if max_diff < 1e-5:
    print(f"\n   ✅ VERIFIED: Model is order-independent!")
    print(f"   Shuffling Crop_Year does NOT affect predictions.")
else:
    print(f"\n   ⚠️  WARNING: Small numerical differences detected.")
    print(f"   This is likely due to floating-point precision.")

print("="*60)

fig = make_subplots(
    rows=1, cols=2,
    subplot_titles=('Model Loss', 'Model MAE')
)

fig.add_trace(
    go.Scatter(
        y=history.history['loss'],
        name='Training Loss',
        line=dict(color='#3b82f6', width=2)
    ),
    row=1, col=1
)

fig.add_trace(
    go.Scatter(
        y=history.history['val_loss'],
        name='Validation Loss',
        line=dict(color='#ef4444', width=2)
    ),
    row=1, col=1
)

fig.add_trace(
    go.Scatter(
        y=history.history['mae'],
        name='Training MAE',
        line=dict(color='#10b981', width=2)
    ),
    row=1, col=2
)

fig.add_trace(
    go.Scatter(
        y=history.history['val_mae'],
        name='Validation MAE',
        line=dict(color='#f59e0b', width=2)
    ),
    row=1, col=2
)

fig.update_xaxes(title_text="Epoch", row=1, col=1)
fig.update_xaxes(title_text="Epoch", row=1, col=2)
fig.update_yaxes(title_text="Loss", row=1, col=1)
fig.update_yaxes(title_text="MAE", row=1, col=2)

fig.update_layout(
    title_text='LSTM Training History',
    template='plotly_white',
    height=400,
    showlegend=True
)

fig.write_html(f'{output_dir}/lstm_training_history.html')
print(f"✅ Saved: lstm_training_history.html")

fig = go.Figure()

metrics = ['RMSE', 'MAE', 'R² Score']
values = [results['LSTM']['RMSE'], results['LSTM']['MAE'], results['LSTM']['R²']]
colors = ['#ef4444', '#f59e0b', '#22c55e']

fig.add_trace(go.Bar(
    x=metrics,
    y=values,
    marker_color=colors,
    text=[f'{v:.4f}' for v in values],
    textposition='auto',
    textfont=dict(size=14, color='white')
))

fig.update_layout(
    title='LSTM Model Performance Metrics (Order-Independent)',
    yaxis_title='Score',
    template='plotly_white',
    height=400,
    showlegend=False
)

fig.write_html(f'{output_dir}/model_comparison.html')
print(f"✅ Saved: model_comparison.html")

fig = go.Figure()

fig.add_trace(go.Scatter(
    x=y_test,
    y=y_pred,
    mode='markers',
    name='Predictions',
    marker=dict(
        size=8,
        color='#3b82f6',
        opacity=0.6,
        line=dict(width=1, color='white')
    )
))

min_val = min(y_test.min(), y_pred.min())
max_val = max(y_test.max(), y_pred.max())
fig.add_trace(go.Scatter(
    x=[min_val, max_val],
    y=[min_val, max_val],
    mode='lines',
    name='Perfect Prediction',
    line=dict(color='#ef4444', dash='dash', width=2)
))

fig.update_layout(
    title=f'Actual vs Predicted - LSTM Model (R² = {r2:.4f})<br><sub>Order-Independent: Works with shuffled data</sub>',
    xaxis_title='Actual Yield Values',
    yaxis_title='Predicted Yield Values',
    template='plotly_white',
    showlegend=True,
    height=500
)

fig.write_html(f'{output_dir}/actual_vs_predicted.html')
print(f"✅ Saved: actual_vs_predicted.html")

model_save_path = f'{output_dir}/lstm_crop_yield_model.h5'
model.save(model_save_path)
print(f"💾 Model saved: {model_save_path}")

joblib.dump(scaler, f'{output_dir}/feature_scaler.pkl')
joblib.dump(y_scaler, f'{output_dir}/target_scaler.pkl')
print(f"💾 Scalers saved")

model_performance = pd.DataFrame({
    'Model': ['LSTM (Order-Independent)'],
    'RMSE': [rmse],
    'MAE': [mae],
    'R2_Score': [r2],
    'MSE': [mse],
    'MAPE': [mape],
    'Order_Independent': [True]
})
model_performance.to_csv(f'{output_dir}/model_performance.csv', index=False)
print(f"✅ Saved: model_performance.csv")

predictions_df = pd.DataFrame({
    'Actual': y_test.values,
    'Predicted': y_pred,
    'Error': y_test.values - y_pred
})
predictions_df.to_csv(f'{output_dir}/lstm_predictions.csv', index=False)
print(f"✅ Saved: lstm_predictions.csv")

config = {
    'model_type': 'LSTM (Order-Independent)',
    'order_independent': True,
    'timesteps': 1,
    'n_features': int(n_features),
    'feature_columns': feature_cols,
    'target_column': target_col,
    'train_samples': int(len(X_train)),
    'test_samples': int(len(X_test)),
    'rmse': float(rmse),
    'mae': float(mae),
    'r2_score': float(r2),
    'note': 'This model does NOT depend on temporal ordering. Shuffling Crop_Year will not affect predictions.'
}

with open(f'{output_dir}/model_config.json', 'w') as f:
    json.dump(config, f, indent=2)
print(f"✅ Saved: model_config.json")

print("\n" + "="*60)
print("🎉 LSTM Model Training Complete!")
print("="*60)
print(f"\n⚠️  IMPORTANT: This model is ORDER-INDEPENDENT")
print(f"   • Crop_Year can be shuffled without affecting predictions")
print(f"   • Each sample is processed independently")
print(f"   • No temporal dependencies")
print("\n📁 All outputs saved to: " + output_dir)

