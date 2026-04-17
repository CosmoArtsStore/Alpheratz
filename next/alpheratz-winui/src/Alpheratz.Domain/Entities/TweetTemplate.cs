namespace Alpheratz.Domain.Entities;

/// <summary>
/// Domain entity representing a tweet template for photo export.
/// Follows Design Doc Section 8.4 / 1210.
/// </summary>
public class TweetTemplate
{
    public int Id { get; }
    public string Name { get; }
    public string TemplateText { get; }
    public bool IsActive { get; }

    public TweetTemplate(int id, string name, string templateText, bool isActive)
    {
        Id = id;
        Name = name;
        TemplateText = templateText;
        IsActive = isActive;
    }

    /// <summary>
    /// Creates a new template with the given properties.
    /// Used for creation before ID is assigned by the database.
    /// </summary>
    public static TweetTemplate CreateNew(string name, string text)
        => new(0, name, text, false);
}
