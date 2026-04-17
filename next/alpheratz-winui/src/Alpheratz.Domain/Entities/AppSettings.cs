using System.Collections.Generic;
using Alpheratz.Domain.Settings;

namespace Alpheratz.Domain.Entities;

public record AppSettings
{
    public string PhotoFolderPath { get; init; } = string.Empty;
    public string SecondaryPhotoFolderPath { get; init; } = string.Empty;

    /// <summary>The selected application theme.</summary>
    public ThemeMode Theme { get; init; } = ThemeMode.System;

    public string ViewMode { get; init; } = "standard";
    public bool EnableStartup { get; init; }
    public bool StartupPreferenceSet { get; init; }
    public IReadOnlyList<string> TweetTemplates { get; init; } = new List<string>();
    public string ActiveTweetTemplate { get; init; } = string.Empty;

    /// <summary>Indicates whether settings have been configured at least once.</summary>
    public bool IsInitialized => !string.IsNullOrEmpty(PhotoFolderPath) || StartupPreferenceSet;

    public static AppSettings CreateDefault()
    {
        var templates = new List<string>
        {
            "おは{world-name}\n\n#{タグを追加}",
            "World: {world-name}\nAuthor:\n\n#VRChat_world紹介",
            "World: {world-name}\nAuthor:\nCloth:\n\n#VRChatPhotography"
        };
        return new AppSettings
        {
            TweetTemplates = templates,
            ActiveTweetTemplate = templates[0]
        };
    }
}
