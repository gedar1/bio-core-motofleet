import type { ComponentProps } from "react";
import { SearchBox } from "@mapbox/search-js-react";
import type { RouteEstimateResponse } from "../../../types/api";

export type PointKind = "origin" | "destination";

/** Address and pin data for one route endpoint. */
export interface RouteLocation {
  /** Address label confirmed by the user and shown to the rider. */
  readonly address: string;
  /** Text originally entered by the user, before geocoder normalization. */
  readonly inputAddress: string;
  /** Address returned by the geocoder, when one exists. */
  readonly resolvedAddress: string | null;
  /** Exact pin selected by the user or returned by the geocoder. */
  readonly latitude: number;
  readonly longitude: number;
  /** Road-access coordinates used for routing and navigation. */
  readonly routableLatitude?: number;
  readonly routableLongitude?: number;
  /** Instructions for the rider at this point. */
  readonly instructions?: string;
  /** The user explicitly confirmed this point. */
  readonly confirmed: boolean;
}

export interface RouteValue {
  readonly origin: RouteLocation | null;
  readonly destination: RouteLocation | null;
}

export type RoutePreview = RouteEstimateResponse;

export interface RoutePickerMapboxProps {
  readonly value: RouteValue;
  readonly onChange: (value: RouteValue) => void;
  readonly routePreview?: RoutePreview | null;
}

export type SearchBoxRetrieveResponse = Parameters<
  NonNullable<ComponentProps<typeof SearchBox>["onRetrieve"]>
>[0];
export type SearchBoxRetrieveFeature = SearchBoxRetrieveResponse["features"][number];
