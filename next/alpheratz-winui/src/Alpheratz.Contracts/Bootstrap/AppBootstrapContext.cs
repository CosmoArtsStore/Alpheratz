using Alpheratz.Domain.Settings;

namespace Alpheratz.Contracts.Bootstrap;

public sealed record AppBootstrapContext(ThemeMode InitialThemeMode, string DatabasePath);
