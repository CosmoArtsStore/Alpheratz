using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Data;
using System;

namespace Alpheratz.Presentation.Converters;

public class BoolToVisibilityConverter : IValueConverter
{
    public object Convert(object value, Type targetType, object parameter, string language)
    {
        bool bValue = false;
        if (value is bool b) bValue = b;
        
        return bValue ? Visibility.Visible : Visibility.Collapsed;
    }

    public object ConvertBack(object value, Type targetType, object parameter, string language)
    {
        throw new NotImplementedException();
    }
}
