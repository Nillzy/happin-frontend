import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { EventListItem } from '../types/events';

const STORAGE_KEY = '@happin:saved_events';

interface SavedEventsContextType {
    savedEventIds: Set<string>;
    savedEvents: EventListItem[];
    toggleSaveEvent: (event: EventListItem) => void;
    isSaved: (eventId: string) => boolean;
}

const SavedEventsContext = createContext<SavedEventsContextType | undefined>(undefined);

export function SavedEventsProvider({ children }: { children: ReactNode }) {
    const [savedEventIds, setSavedEventIds] = useState<Set<string>>(new Set());
    const [savedEvents, setSavedEvents] = useState<EventListItem[]>([]);

    // Load saved events from AsyncStorage on mount
    useEffect(() => {
        const loadSavedEvents = async () => {
            try {
                const stored = await AsyncStorage.getItem(STORAGE_KEY);
                if (stored) {
                    const parsed: EventListItem[] = JSON.parse(stored);
                    setSavedEvents(parsed);
                    setSavedEventIds(new Set(parsed.map(e => e.event_id)));
                }
            } catch (error) {
                console.error('Failed to load saved events:', error);
            }
        };

        void loadSavedEvents();
    }, []);

    // Save to AsyncStorage whenever savedEvents changes
    useEffect(() => {
        const saveToDisk = async () => {
            try {
                await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(savedEvents));
            } catch (error) {
                console.error('Failed to save events:', error);
            }
        };

        if (savedEvents.length > 0 || savedEventIds.size === 0) {
            void saveToDisk();
        }
    }, [savedEvents, savedEventIds.size]);

    const toggleSaveEvent = (event: EventListItem) => {
        setSavedEventIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(event.event_id)) {
                newSet.delete(event.event_id);
                // Remove from savedEvents array
                setSavedEvents(current => current.filter(e => e.event_id !== event.event_id));
            } else {
                newSet.add(event.event_id);
                // Add to savedEvents array
                setSavedEvents(current => [...current, event]);
            }
            return newSet;
        });
    };

    const isSaved = (eventId: string) => savedEventIds.has(eventId);

    return (
        <SavedEventsContext.Provider value={{ savedEventIds, savedEvents, toggleSaveEvent, isSaved }}>
            {children}
        </SavedEventsContext.Provider>
    );
}

export function useSavedEvents() {
    const context = useContext(SavedEventsContext);
    if (!context) {
        throw new Error('useSavedEvents must be used within SavedEventsProvider');
    }
    return context;
}
