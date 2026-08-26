'use client'
import { useState, useEffect } from 'react';

const useLocationData = () => {
    const [selectedOption, setSelectedOption] = useState(null);
    const [countries, setCountries] = useState([]);
    const [states, setStates] = useState([]);
    const [cities, setCities] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchStates = async (country) => {
        setError(null);
        setLoading(true)
        try {
            const response = await fetch('https://countriesnow.space/api/v0.1/countries/states', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ country: country })
            });

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            const data = await response.json();
            const transformedStates = data.data.states.map(state => ({
                value: state.name.toLowerCase().replace(/\s+/g, '-'),
                label: state.name
            }));

            setStates(transformedStates);
        } catch (err) {
            setLoading(false);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };
    const fetchCountry = async () => {
        setError(null);
        setLoading(true)
        try {
            const response = await fetch('https://countriesnow.space/api/v0.1/countries/flag/images');

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            const data = await response.json();
            const transformedStates = data.data.map(country => ({
                value: country.iso3.toLowerCase().replace(/\s+/g, '-'),
                label: country.name,
                img: country.flag
            }));

            setCountries(transformedStates);
        } catch (err) {
            setError(err.message);
            setLoading(false);
        } finally {
            setLoading(false);
        }
    };

    const fetchCities = async (state) => {
        setError(null);
        setLoading(true)
        try {
            //console.log('Fetching cities for state:', state);

            // Since countriesnow API doesn't have state-specific cities,
            // we'll use a different approach or mock data for now
            // In production, you might want to use a different API service

            // For demonstration, let's create state-specific cities
            const stateCities = {
                'uttarakhand': [
                    { value: 'dehradun', label: 'Dehradun' },
                    { value: 'haridwar', label: 'Haridwar' },
                    { value: 'rishikesh', label: 'Rishikesh' },
                    { value: 'nainital', label: 'Nainital' },
                    { value: 'almora', label: 'Almora' }
                ],
                'maharashtra': [
                    { value: 'mumbai', label: 'Mumbai' },
                    { value: 'pune', label: 'Pune' },
                    { value: 'nagpur', label: 'Nagpur' },
                    { value: 'thane', label: 'Thane' },
                    { value: 'nashik', label: 'Nashik' }
                ],
                'karnataka': [
                    { value: 'bangalore', label: 'Bangalore' },
                    { value: 'mysore', label: 'Mysore' },
                    { value: 'mangalore', label: 'Mangalore' },
                    { value: 'hubli', label: 'Hubli' },
                    { value: 'belgaum', label: 'Belgaum' }
                ],
                'delhi': [
                    { value: 'new-delhi', label: 'New Delhi' },
                    { value: 'old-delhi', label: 'Old Delhi' },
                    { value: 'connaught-place', label: 'Connaught Place' },
                    { value: 'karol-bagh', label: 'Karol Bagh' },
                    { value: 'lajpat-nagar', label: 'Lajpat Nagar' }
                ],
                'gujarat': [
                    { value: 'ahmedabad', label: 'Ahmedabad' },
                    { value: 'surat', label: 'Surat' },
                    { value: 'vadodara', label: 'Vadodara' },
                    { value: 'rajkot', label: 'Rajkot' },
                    { value: 'bhavnagar', label: 'Bhavnagar' }
                ]
            };

            // Convert state name to lowercase for matching
            const stateKey = state.toLowerCase().replace(/\s+/g, '');

            // Get cities for the selected state, fallback to empty array
            const cities = stateCities[stateKey] || [
                { value: 'city1', label: 'City 1' },
                { value: 'city2', label: 'City 2' },
                { value: 'city3', label: 'City 3' }
            ];

            setCities(cities);

        } catch (err) {
            setLoading(false);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCountry();
    }, []);

    useEffect(() => {
        if (countries?.length > 0) {
            const x = countries.findIndex((country) => country?.value === "usa")
            fetchStates(countries[210]?.label);
            fetchCities(countries[210]?.label);
        }
    }, [countries]);
    
    return {
        selectedOption,
        countries,
        states,
        cities,
        loading,
        error,
        fetchCountry,
        fetchStates,
        fetchCities,
    };
};

export default useLocationData;