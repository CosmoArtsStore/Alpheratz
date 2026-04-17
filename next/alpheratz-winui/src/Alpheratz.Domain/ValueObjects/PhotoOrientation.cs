namespace Alpheratz.Domain.ValueObjects;

/// <summary>
/// Defines the orientation of a photo.
/// </summary>
public enum PhotoOrientation
{
    /// <summary>
    /// Orientation is not determined.
    /// </summary>
    Unknown,

    /// <summary>
    /// The photo is taller than it is wide.
    /// </summary>
    Portrait,

    /// <summary>
    /// The photo is wider than it is tall.
    /// </summary>
    Landscape,

    /// <summary>
    /// The photo is perfectly square.
    /// </summary>
    Square
}

/// <summary>
/// Extension methods for <see cref="PhotoOrientation"/>.
/// </summary>
public static class PhotoOrientationExtensions
{
    public static string ToFriendlyName(this PhotoOrientation orientation) => orientation switch
    {
        PhotoOrientation.Portrait => "Portrait",
        PhotoOrientation.Landscape => "Landscape",
        PhotoOrientation.Square => "Square",
        _ => "Unknown"
    };
}
