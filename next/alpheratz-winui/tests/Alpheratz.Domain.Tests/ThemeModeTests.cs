using Alpheratz.Domain.Settings;

namespace Alpheratz.Domain.Tests;

public sealed class ThemeModeTests
{
    [Fact]
    public void ThemeMode_DefinesLightAndDark()
    {
        var values = Enum.GetValues<ThemeMode>();

        Assert.Contains(ThemeMode.Light, values);
        Assert.Contains(ThemeMode.Dark, values);
    }
}
