"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import MapView from "@/components/MapView";
import { createClient } from "@/lib/supabase/client";
import { reverseGeocode, searchPlace, type GeocodeResult } from "@/lib/geocode";
import { todayLocalYmd, type JoinMePost } from "@/lib/joinMe";

export function JoinMeComposer({
  existingPosts = [],
  initialPost,
  locale = "en",
  onSaved,
  onCancel,
}: {
  existingPosts?: JoinMePost[];
  initialPost?: JoinMePost;
  locale?: string;
  onSaved: (post: JoinMePost) => void;
  onCancel: () => void;
}) {
  const t = useTranslations();
  const supabase = createClient();
  const isEditing = Boolean(initialPost);

  const [title, setTitle] = useState(initialPost?.title ?? "");
  const [city, setCity] = useState(initialPost?.city ?? "");
  const [country, setCountry] = useState(initialPost?.country ?? "");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    initialPost ? { lat: initialPost.lat, lng: initialPost.lng } : null,
  );
  const [startDate, setStartDate] = useState(
    initialPost?.start_date ?? todayLocalYmd(),
  );
  const [endDate, setEndDate] = useState(initialPost?.end_date ?? "");
  const [scheduleNote, setScheduleNote] = useState(
    initialPost?.schedule_note ?? "",
  );
  const [details, setDetails] = useState(initialPost?.details ?? "");

  const [reverseLoading, setReverseLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Place search state
  const [query, setQuery] = useState(initialPost?.city ?? "");
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchBoxRef = useRef<HTMLDivElement | null>(null);
  const [flyTo, setFlyTo] = useState<{
    center: [number, number];
    zoom?: number;
    nonce: number;
  } | null>(null);
  const flyNonceRef = useRef(0);

  useEffect(() => {
    const q = query.trim();
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (q.length < 2) {
      timer = setTimeout(() => {
        if (cancelled) return;
        setResults([]);
        setShowDropdown(false);
      }, 0);
    } else {
      timer = setTimeout(async () => {
        if (cancelled) return;
        setSearching(true);
        const r = await searchPlace(q);
        if (cancelled) return;
        setResults(r);
        setShowDropdown(true);
        setSearching(false);
      }, 400);
    }
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [query]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (!searchBoxRef.current) return;
      if (!searchBoxRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function pickResult(r: GeocodeResult) {
    setShowDropdown(false);
    const shortName = r.city || r.displayName.split(",")[0];
    setQuery(shortName);
    setCity(shortName);
    setCountry(r.country);
    setCoords({ lat: r.lat, lng: r.lng });
    setError(null);
    flyNonceRef.current += 1;
    setFlyTo({ center: [r.lng, r.lat], zoom: 11, nonce: flyNonceRef.current });
  }

  async function handleMapClick(lng: number, lat: number) {
    setError(null);
    setCoords({ lat, lng });
    setReverseLoading(true);
    const place = await reverseGeocode(lat, lng);
    setReverseLoading(false);
    if (place.city) {
      setCity(place.city);
      setQuery(place.city);
    }
    if (place.country) {
      setCountry(place.country);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!coords) {
      setError(t("JoinMe.errPickLocation"));
      return;
    }
    if (!title.trim() || !city.trim() || !startDate) {
      setError(t("JoinMe.errMissingFields"));
      return;
    }
    if (endDate && endDate < startDate) {
      setError(t("JoinMe.errEndBeforeStart"));
      return;
    }

    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      setError(t("JoinMe.signInToPost"));
      return;
    }

    const payload = {
      title: title.trim(),
      city: city.trim(),
      country: country.trim(),
      lat: coords.lat,
      lng: coords.lng,
      start_date: startDate,
      end_date: endDate || null,
      schedule_note: scheduleNote.trim(),
      details: details.trim(),
    };

    if (isEditing && initialPost) {
      const { data, error: updateErr } = await supabase
        .from("join_me_posts")
        .update(payload)
        .eq("id", initialPost.id)
        .select(
          "id, user_id, title, city, country, lat, lng, start_date, end_date, schedule_note, details, status, created_at",
        )
        .single();

      setSaving(false);
      if (updateErr || !data) {
        setError(t("JoinMe.errSaveFailed"));
        return;
      }

      onSaved({
        ...initialPost,
        title: data.title,
        city: data.city,
        country: data.country,
        lat: data.lat,
        lng: data.lng,
        start_date: data.start_date,
        end_date: data.end_date,
        schedule_note: data.schedule_note,
        details: data.details,
        status: data.status === "closed" ? "closed" : "open",
      });
      return;
    }

    const { data, error: insertErr } = await supabase
      .from("join_me_posts")
      .insert({
        user_id: user.id,
        ...payload,
      })
      .select(
        "id, user_id, title, city, country, lat, lng, start_date, end_date, schedule_note, details, status, created_at",
      )
      .single();

    if (insertErr || !data) {
      setSaving(false);
      setError(t("JoinMe.errSaveFailed"));
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name, avatar_url")
      .eq("id", user.id)
      .maybeSingle();

    setSaving(false);
    onSaved({
      id: data.id,
      owner_id: data.user_id,
      owner_display_name: profile?.display_name ?? t("Fallback.pinner"),
      owner_avatar_url: profile?.avatar_url ?? "",
      title: data.title,
      city: data.city,
      country: data.country,
      lat: data.lat,
      lng: data.lng,
      start_date: data.start_date,
      end_date: data.end_date,
      schedule_note: data.schedule_note,
      details: data.details,
      status: data.status === "closed" ? "closed" : "open",
      created_at: data.created_at,
      reply_count: 0,
      joiner_count: 0,
    });
  }

  const inputClass =
    "mt-1.5 w-full rounded-lg border border-border bg-surface-2/60 px-3.5 py-2 text-sm text-ink outline-none focus:border-verde focus:bg-surface focus:ring-2 focus:ring-verde/20";
  const labelClass =
    "font-typewriter block text-xs font-bold uppercase tracking-wider text-ink";

  return (
    <div className="relative overflow-hidden rounded-xl border-2 border-verde/50 bg-surface shadow-md">
      <div className="h-2 w-full bg-verde" />

      <div className="p-5 sm:p-6">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-2 border-b border-dashed border-border pb-3">
          <div>
            <h2 className="font-display text-xl font-bold text-ink">
              {isEditing ? t("JoinMe.editPost") : t("JoinMe.composerTitle")}
            </h2>
            <p className="mt-0.5 text-xs text-ink-muted">
              {t("JoinMe.composerSubtitle")}
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="font-typewriter rounded border border-border bg-surface-2 px-2.5 py-1 text-xs font-bold text-ink-muted hover:text-ink"
          >
            ✕
          </button>
        </div>

        {/* City search */}
        <div ref={searchBoxRef} className="relative mb-4">
          <div className="relative">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted">
              🔎
            </span>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => results.length && setShowDropdown(true)}
              placeholder={t("JoinMe.citySearchPlaceholder")}
              className="font-typewriter w-full rounded-lg border-2 border-border bg-surface py-2 pl-10 pr-4 text-sm text-ink outline-none focus:border-verde focus:ring-2 focus:ring-verde/20"
            />
            {searching && (
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2">
                <span className="inline-block h-2 w-2 animate-ping rounded-full bg-verde" />
              </span>
            )}
          </div>

          {showDropdown && results.length > 0 && (
            <ul className="absolute z-30 mt-1 w-full overflow-hidden rounded-lg border-2 border-border bg-surface py-1 shadow-lg">
              {results.map((r, i) => (
                <li key={`${r.lat},${r.lng}-${i}`}>
                  <button
                    type="button"
                    onClick={() => pickResult(r)}
                    className="flex w-full items-start gap-2 px-4 py-2 text-left text-sm hover:bg-surface-2"
                  >
                    <span className="text-verde">📍</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-bold text-ink">
                        {r.city || r.displayName.split(",")[0]}
                      </span>
                      <span className="font-typewriter block truncate text-xs text-ink-muted">
                        {r.displayName}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="grid gap-5 lg:grid-cols-[1.05fr_1.15fr]">
          {/* Map picker */}
          <div>
            <div className="overflow-hidden rounded-lg border-2 border-border">
              <MapView
                pins={[]}
                joinMePosts={existingPosts.filter((p) => p.id !== initialPost?.id)}
                draftMarker={coords}
                locale={locale}
                initialCenter={coords ? [coords.lng, coords.lat] : undefined}
                initialZoom={coords ? 10 : 5}
                onMapClick={handleMapClick}
                flyTo={flyTo ?? undefined}
                className="h-[300px] w-full lg:h-[380px]"
              />
            </div>
            <p className="font-typewriter mt-2 text-[11px] text-ink-muted">
              {reverseLoading ? (
                <span>⏳ {t("Add.lookingUp")}</span>
              ) : coords ? (
                <span>
                  📍 {[city, country].filter(Boolean).join(", ") || t("Add.unknownSpot")} (
                  {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)})
                </span>
              ) : (
                <span>🗺️ {t("JoinMe.pickOnMapHint")}</span>
              )}
            </p>
          </div>

          {/* Post form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <label className={labelClass}>
              {t("JoinMe.fieldTitle")} *
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t("JoinMe.fieldTitlePlaceholder")}
                className={inputClass}
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className={labelClass}>
                {t("JoinMe.fieldCity")} *
                <input
                  type="text"
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder={t("JoinMe.fieldCityPlaceholder")}
                  className={inputClass}
                />
              </label>

              <label className={labelClass}>
                {t("JoinMe.fieldCountry")}
                <input
                  type="text"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder={t("JoinMe.fieldCountryPlaceholder")}
                  className={inputClass}
                />
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className={labelClass}>
                {t("JoinMe.fieldStartDate")} *
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    if (endDate && endDate < e.target.value) {
                      setEndDate(e.target.value);
                    }
                  }}
                  className={inputClass}
                />
              </label>

              <label className={labelClass}>
                {t("JoinMe.fieldEndDate")}{" "}
                <span className="text-ink-muted">{t("Common.optional")}</span>
                <input
                  type="date"
                  min={startDate || undefined}
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className={inputClass}
                />
              </label>
            </div>

            <label className={labelClass}>
              {t("JoinMe.fieldScheduleNote")}{" "}
              <span className="text-ink-muted">{t("Common.optional")}</span>
              <input
                type="text"
                value={scheduleNote}
                onChange={(e) => setScheduleNote(e.target.value)}
                placeholder={t("JoinMe.fieldScheduleNotePlaceholder")}
                className={inputClass}
              />
            </label>

            <label className={labelClass}>
              ✎ {t("JoinMe.fieldDetails")}{" "}
              <span className="text-ink-muted">{t("Common.optional")}</span>
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                rows={3}
                placeholder={t("JoinMe.fieldDetailsPlaceholder")}
                className={`${inputClass} journal-lined`}
              />
            </label>

            {error && (
              <p className="font-typewriter rounded-lg border border-danger/40 bg-danger/10 p-3 text-xs text-danger">
                {error}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="submit"
                disabled={saving}
                className="font-typewriter flex-1 rounded-lg border-2 border-ink bg-verde px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-[3px_3px_0px_var(--ink)] transition hover:translate-y-[-1px] hover:opacity-95 disabled:opacity-60"
              >
                {saving
                  ? isEditing
                    ? t("JoinMe.saving")
                    : t("JoinMe.publishing")
                  : isEditing
                    ? t("JoinMe.saveChanges")
                    : t("JoinMe.publishPost")}
              </button>
              <button
                type="button"
                onClick={onCancel}
                disabled={saving}
                className="font-typewriter rounded-lg border border-border px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-ink-muted hover:bg-surface-2"
              >
                {t("JoinMe.cancel")}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
