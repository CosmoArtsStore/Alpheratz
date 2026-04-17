using Microsoft.UI.Xaml.Data;
using System;

namespace Alpheratz.Presentation.Converters;

public class FavoriteIconConverter : IValueConverter
{
    public object Convert(object value, Type targetType, object parameter, string language)
    {
        if (value is bool isFavorite && isFavorite)
        {
            return "\uE735"; // Filled Heart
        }
        return "\uE734"; // Header Heart
    }

    public object ConvertBack(object value, Type targetType, object parameter, string language)
    {
        throw new NotImplementedException();
    }
}
