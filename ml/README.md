# LSTM Crop Yield Prediction - Quick Start Guide

## 🚀 Getting Started

### 1. Install Dependencies
```bash
pip install tensorflow keras pandas numpy scikit-learn plotly matplotlib seaborn joblib
```

### 2. Prepare Your Data
Place your `crop_yield.csv` file in the parent `ml/` directory, or update the path in Cell 2 of the notebook.

Required columns (adjust as needed):
- `Crop_Year` - Year of the crop
- `Area` - Cultivated area
- `Production` - Crop production
- `Yield` - Target variable (what we're predicting)
- Other features (rainfall, fertilizer, pesticide, etc.)

### 3. Run the Notebook
```bash
cd lstm_analysis
jupyter notebook lstm_crop_yield_prediction.ipynb
```

Or use VS Code or JupyterLab.

## 📊 What This Does

This LSTM model:
- **Learns from historical patterns**: Uses 5 years of past data to predict next year
- **Captures temporal dependencies**: Understanding how crop yields change over time
- **Deep learning approach**: LSTM neural network with 3 layers
- **Comprehensive evaluation**: Multiple metrics and visualizations

## 📁 Output Files

After running the notebook, you'll find in `../output_charts/`:

### Model Files:
- `lstm_crop_yield_model.h5` - Trained model (ready for deployment)
- `feature_scaler.pkl` - Feature preprocessor  
- `target_scaler.pkl` - Target variable scaler
- `model_config.json` - Model configuration

### Performance Files:
- `model_performance.csv` - Metrics (RMSE, MAE, R²)
- `lstm_predictions.csv` - Test set predictions

### Visualizations (HTML):
- `lstm_training_history.html` - Training curves
- `model_comparison.html` - Performance metrics
- `actual_vs_predicted.html` - Scatter plot
- `time_series_prediction.html` - Sequential predictions
- `error_analysis.html` - Error distributions

## 🎯 Model Architecture

```
Input: (5 timesteps, N features)
   ↓
LSTM(128) → Dropout(0.2)
   ↓
LSTM(64) → Dropout(0.2)
   ↓
LSTM(32) → Dropout(0.2)
   ↓
Dense(16) → Dropout(0.1)
   ↓
Dense(1) - Output (Predicted Yield)
```

## 📈 Expected Performance

- **R² Score**: 0.80-0.95 (good to excellent)
- **RMSE**: Depends on your data scale
- **MAE**: Average prediction error
- **MAPE**: Percentage error

## 🔧 Customization

### Change Sequence Length:
In Cell 5, modify:
```python
n_steps = 5  # Change to 3, 7, or 10
```

### Adjust Model Complexity:
In Cell 7, modify LSTM units:
```python
LSTM(128, ...)  # Change to 64, 256, etc.
```

### Training Parameters:
In Cell 8, modify:
```python
epochs=100,      # More epochs for better training
batch_size=32,   # Smaller = slower but more accurate
```

## 🚨 Troubleshooting

### Memory Issues:
- Reduce batch_size: `32 → 16`
- Reduce LSTM units: `128 → 64`
- Reduce sequence length: `n_steps = 3`

### Slow Training:
- Reduce epochs if early stopping isn't working
- Use GPU if available (TensorFlow auto-detects)
- Reduce model complexity

### Poor Performance:
- Increase `n_steps` for more context
- Add more features
- Normalize/clean your data
- Check for data quality issues

## 🔮 Making Predictions

After training, use the prediction function in Cell 16:

```python
# Example for 5 years of data
new_data = pd.DataFrame({
    'Crop_Year': [2020, 2021, 2022, 2023, 2024],
    'Area': [100, 105, 110, 108, 112],
    'Production': [500, 520, 550, 540, 560],
    # ... other features
})

prediction = load_model_and_predict(new_data)
print(f"Predicted yield for 2025: {prediction:.2f}")
```

## 📞 Support

For issues or questions:
1. Check the error message in the notebook output
2. Verify your data format matches requirements
3. Review the LSTM_IMPLEMENTATION_GUIDE.md
4. Check TensorFlow/Keras documentation

## 🎓 Learning Resources

- [TensorFlow LSTM Tutorial](https://www.tensorflow.org/guide/keras/rnn)
- [Time Series Forecasting Guide](https://machinelearningmastery.com/time-series-forecasting-long-short-term-memory-network-python/)
- [LSTM Architecture Explained](https://colah.github.io/posts/2015-08-Understanding-LSTMs/)

Happy predicting! 🌾📊
