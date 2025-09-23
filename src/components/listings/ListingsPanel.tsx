"use client";

import type { Id } from "convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { HeartPlus, Phone, Trash2 } from "lucide-react";
import Image from "next/image";
import { api } from "@/lib/convexApi";

type ListingBase = {
  title: string;
  address: string;
  price: number;
  phone?: string;
  imageUrl?: string;
};

type LiveListing = ListingBase & { id: Id<"listings">; createdAt: number };
type FavoriteListing = ListingBase & {
  id: Id<"favorites">;
  favoritedAt: number;
};

type ListingsPanelProps = {
  onFavoritedAction?: (listingId: Id<"listings">) => void;
};

export function ListingsPanel({ onFavoritedAction }: ListingsPanelProps) {
  const listings = (useQuery(api.listings.listListings, {}) ??
    []) as LiveListing[];
  const favorites = (useQuery(api.listings.listFavorites, {}) ??
    []) as FavoriteListing[];
  const favoriteListing = useMutation(api.listings.favoriteListing);
  const removeListing = useMutation(api.listings.removeListing);
  const removeFavorite = useMutation(api.listings.removeFavorite);

  const handleFavorite = async (listingId: Id<"listings">) => {
    await favoriteListing({ listingId });
    onFavoritedAction?.(listingId);
  };

  const handleRemoveListing = async (listingId: Id<"listings">) => {
    await removeListing({ listingId });
  };

  const handleRemoveFavorite = async (favoriteId: Id<"favorites">) => {
    await removeFavorite({ favoriteId });
  };

  return (
    <section className="card h-[26rem] bg-base-100 shadow-sm lg:rounded-3xl">
      <div className="card-body flex h-full flex-col gap-2 overflow-hidden">
        <header className="flex items-start justify-between">
          <div>
            <h2 className="card-title">Live listings</h2>
            <p className="text-sm opacity-70">
              Listings captured via Buscalo tools.
            </p>
            <p className="text-sm opacity-70">Favorite the ones you like.</p>
          </div>
          <span className="badge badge-sm badge-neutral self-start">
            {listings.length}
          </span>
        </header>

        <div className="scrollbar-thin flex-1 space-y-4 overflow-y-auto rounded-box border border-base-300/70 bg-base-200/60 p-3 pr-1">
          {listings.length === 0 ? (
            <div className="rounded-box border border-base-300 border-dashed p-4 text-sm opacity-70">
              Ask Buscalo to pull some listings and they'll appear here.
            </div>
          ) : (
            listings.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                onFavorite={handleFavorite}
                onRemove={handleRemoveListing}
              />
            ))
          )}
        </div>

        <FavoritesList
          favorites={favorites}
          onRemoveFavorite={handleRemoveFavorite}
        />
      </div>
    </section>
  );
}

type ListingCardProps = {
  listing: LiveListing;
  onFavorite: (listingId: Id<"listings">) => void;
  onRemove: (listingId: Id<"listings">) => void;
};

function ListingCard({ listing, onFavorite, onRemove }: ListingCardProps) {
  return (
    <article className="flex gap-3 rounded-box border border-base-300 bg-base-200/60 p-3">
      <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-box bg-base-300">
        {listing.imageUrl ? (
          <Image
            src={listing.imageUrl}
            alt={listing.title}
            fill
            unoptimized
            className="object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-base-200 text-base-content/60 text-xs">
            No image
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1">
        <div className="flex items-center justify-between gap-3">
          <span className="font-semibold">{listing.title}</span>
          <span className="font-semibold text-primary">
            ${listing.price.toLocaleString("en-US")}
          </span>
        </div>
        <p className="text-sm opacity-80">{listing.address}</p>
        {listing.phone ? (
          <p className="flex items-center gap-1 text-xs opacity-60">
            <Phone className="h-3 w-3" aria-hidden />
            <span>{listing.phone}</span>
          </p>
        ) : null}
        <div className="mt-2 flex items-center gap-2">
          <button
            className="btn btn-xs btn-primary"
            type="button"
            onClick={() => onFavorite(listing.id)}
          >
            <HeartPlus className="h-4 w-4" aria-hidden />
            Favorite
          </button>
          <button
            className="btn btn-xs btn-ghost"
            type="button"
            onClick={() => onRemove(listing.id)}
          >
            <Trash2 className="h-4 w-4" aria-hidden />
            Remove
          </button>
        </div>
      </div>
    </article>
  );
}

type FavoritesListProps = {
  favorites: FavoriteListing[];
  onRemoveFavorite: (favoriteId: Id<"favorites">) => void;
};

function FavoritesList({ favorites, onRemoveFavorite }: FavoritesListProps) {
  return (
    <footer className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">Favorites</h3>
        <span className="badge badge-sm badge-neutral">{favorites.length}</span>
      </div>
      <div className="space-y-3">
        {favorites.length === 0 ? (
          <p className="text-sm opacity-70">
            Favorited listings will move here for quick reference.
          </p>
        ) : (
          favorites.map((favorite) => {
            return (
              <article
                key={favorite.id}
                className="flex gap-3 rounded-box border border-base-200 bg-base-200/40 p-3"
              >
                <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-box bg-base-300">
                  {favorite.imageUrl ? (
                    <Image
                      src={favorite.imageUrl}
                      alt={favorite.title}
                      fill
                      unoptimized
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-base-200 text-base-content/60 text-xs">
                      No image
                    </div>
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-1">
                  <span className="font-medium">{favorite.title}</span>
                  <span className="text-sm opacity-80">{favorite.address}</span>
                  {favorite.phone ? (
                    <span className="flex items-center gap-1 text-xs opacity-60">
                      <Phone className="h-3 w-3" aria-hidden />
                      {favorite.phone}
                    </span>
                  ) : null}
                </div>
                <div className="flex flex-col justify-between text-right">
                  <span className="font-semibold text-primary">
                    ${favorite.price.toLocaleString("en-US")}
                  </span>
                  <button
                    className="btn btn-xs btn-ghost"
                    type="button"
                    onClick={() => onRemoveFavorite(favorite.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    Remove
                  </button>
                </div>
              </article>
            );
          })
        )}
      </div>
    </footer>
  );
}
