// app/(tabs)/stats.tsx
import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, Alert, Dimensions } from 'react-native';
import {
  Layout,
  Text,
  Card,
  Button,
  Spinner,
  Icon,
  IconProps,
  Calendar,
  useTheme
} from '@ui-kitten/components';
import { getMonthWaterData, getCurrentMonthYear, WaterData } from '@/utils/storage';

const CalendarIcon = (props: IconProps) => (
  <Icon {...props} name='calendar-outline' />
);

const ArrowLeftIcon = (props: IconProps) => (
  <Icon {...props} name='arrow-left-outline' />
);

const ArrowRightIcon = (props: IconProps) => (
  <Icon {...props} name='arrow-right-outline' />
);

export default function StatsScreen() {
  const theme = useTheme();
  const screenWidth = Dimensions.get('window').width;

  const [loading, setLoading] = useState(true);
  const [monthData, setMonthData] = useState<WaterData[]>([]);
  const [currentYear, setCurrentYear] = useState(getCurrentMonthYear().year);
  const [currentMonth, setCurrentMonth] = useState(getCurrentMonthYear().month);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedDayData, setSelectedDayData] = useState<WaterData | null>(null);
  
  // Stats calculations
  const [totalMonthIntake, setTotalMonthIntake] = useState(0);
  const [averageDailyIntake, setAverageDailyIntake] = useState(0);
  const [daysTracked, setDaysTracked] = useState(0);
  const [bestDay, setBestDay] = useState<{date: string, intake: number} | null>(null);
  const [goalAchievement, setGoalAchievement] = useState(0);

  useEffect(() => {
    loadMonthData();
  }, [currentYear, currentMonth]);

  const loadMonthData = async () => {
    try {
      setLoading(true);
      const data = await getMonthWaterData(currentYear, currentMonth);
      setMonthData(data);
      
      // Calculate statistics
      if (data.length > 0) {
        // Total intake for the month
        const total = data.reduce((sum, day) => sum + day.intake, 0);
        setTotalMonthIntake(total);
        
        // Average daily intake
        setAverageDailyIntake(Math.round(total / data.length));
        
        // Days tracked
        setDaysTracked(data.length);
        
        // Best day
        const best = data.reduce((max, day) => day.intake > max.intake ? day : max, data[0]);
        setBestDay({date: best.date, intake: best.intake});
        
        // Goal achievement rate
        const goalDays = data.filter(day => day.intake >= day.goal).length;
        setGoalAchievement(Math.round((goalDays / data.length) * 100));
        
        // If a date is selected, update the selected day data
        if (selectedDate) {
          const selectedDateStr = selectedDate.toISOString().split('T')[0];
          const dayData = data.find(day => day.date === selectedDateStr);
          setSelectedDayData(dayData || null);
        }
      } else {
        // Reset stats if no data
        setTotalMonthIntake(0);
        setAverageDailyIntake(0);
        setDaysTracked(0);
        setBestDay(null);
        setGoalAchievement(0);
      }
    } catch (error) {
      console.error('Error loading month data:', error);
      Alert.alert('Error', 'Failed to load your monthly water data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    let newMonth = currentMonth;
    let newYear = currentYear;
    
    if (direction === 'prev') {
      if (currentMonth === 1) {
        newMonth = 12;
        newYear = currentYear - 1;
      } else {
        newMonth = currentMonth - 1;
      }
    } else {
      if (currentMonth === 12) {
        newMonth = 1;
        newYear = currentYear + 1;
      } else {
        newMonth = currentMonth + 1;
      }
    }
    
    setCurrentMonth(newMonth);
    setCurrentYear(newYear);
    setSelectedDate(null);
    setSelectedDayData(null);
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    
    // Find data for the selected date
    const dateStr = date.toISOString().split('T')[0];
    const dayData = monthData.find(day => day.date === dateStr);
    setSelectedDayData(dayData || null);
  };

  // Function to calculate the marker color based on intake percentage
  const getDayColor = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    const dayData = monthData.find(day => day.date === dateStr);
    
    if (!dayData) return theme['color-basic-400']; // No data
    
    const percentage = dayData.intake / dayData.goal;
    
    if (percentage >= 1) return theme['color-success-500']; // Met or exceeded goal
    if (percentage >= 0.75) return theme['color-success-300']; // Close to goal
    if (percentage >= 0.5) return theme['color-warning-500']; // Half way
    if (percentage > 0) return theme['color-warning-300']; // Some progress
    return theme['color-basic-400']; // No progress
  };

  // Return a function to render day cell content
  const renderDayCellContent = (info: { date: Date }, style: any) => {
    const date = info.date;
    const dateStr = date.toISOString().split('T')[0];
    const dayData = monthData.find(day => day.date === dateStr);
    
    // Style for the day cell based on water intake
    const dotColor = getDayColor(date);
    
    return (
      <View style={styles.dayCell}>
        <Text>{date.getDate()}</Text>
        {dayData && (
          <View style={[styles.dataDot, { backgroundColor: dotColor }]} />
        )}
      </View>
    );
  };

  const getMonthName = (month: number) => {
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return monthNames[month - 1];
  };

  if (loading) {
    return (
      <Layout style={styles.loadingContainer}>
        <Spinner size='large' />
      </Layout>
    );
  }

  return (
    <Layout style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text category='h1' style={styles.title}>Monthly Stats</Text>
        
        {/* Month Navigation */}
        <Card style={styles.card}>
          <View style={styles.monthNavigation}>
            <Button
              appearance='ghost'
              status='basic'
              accessoryLeft={ArrowLeftIcon}
              onPress={() => navigateMonth('prev')}
            />
            <Text category='h5'>{getMonthName(currentMonth)} {currentYear}</Text>
            <Button
              appearance='ghost'
              status='basic'
              accessoryLeft={ArrowRightIcon}
              onPress={() => navigateMonth('next')}
            />
          </View>
          
          {/* Calendar */}
          <View style={styles.calendarContainer}>
            <Calendar
              date={selectedDate || new Date(currentYear, currentMonth - 1, 1)}
              onSelect={handleDateSelect}
              renderDay={renderDayCellContent}
              style={styles.calendar}
              boundingMonth={false}
            />
          </View>
        </Card>
        
        {/* Monthly Statistics */}
        <Card style={styles.card}>
          <Text category='h6' style={styles.cardTitle}>Monthly Overview</Text>
          
          <View style={styles.statRow}>
            <Text>Total Intake:</Text>
            <Text category='s1'>{totalMonthIntake} ml</Text>
          </View>
          
          <View style={styles.statRow}>
            <Text>Average Daily:</Text>
            <Text category='s1'>{averageDailyIntake} ml</Text>
          </View>
          
          <View style={styles.statRow}>
            <Text>Days Tracked:</Text>
            <Text category='s1'>{daysTracked} days</Text>
          </View>
          
          {bestDay && (
            <View style={styles.statRow}>
              <Text>Best Day:</Text>
              <Text category='s1'>{bestDay.date.split('-').slice(1).join('/')} ({bestDay.intake} ml)</Text>
            </View>
          )}
          
          <View style={styles.statRow}>
            <Text>Goal Achievement:</Text>
            <Text category='s1'>{goalAchievement}%</Text>
          </View>
        </Card>
        
        {/* Daily Details */}
        {selectedDayData ? (
          <Card style={styles.card}>
            <Text category='h6' style={styles.cardTitle}>
              {new Date(selectedDayData.date).toLocaleDateString()}
            </Text>
            
            <View style={styles.dailyDetails}>
              <View style={styles.dailyDetailItem}>
                <Text category='s1'>{selectedDayData.intake} ml</Text>
                <Text appearance='hint'>Consumed</Text>
              </View>
              
              <View style={styles.dailyDetailItem}>
                <Text category='s1'>{selectedDayData.goal} ml</Text>
                <Text appearance='hint'>Goal</Text>
              </View>
              
              <View style={styles.dailyDetailItem}>
                <Text category='s1'>
                  {Math.round((selectedDayData.intake / selectedDayData.goal) * 100)}%
                </Text>
                <Text appearance='hint'>Achievement</Text>
              </View>
            </View>
            
            {/* Visual representation of daily progress */}
            <View style={styles.progressContainer}>
              <View 
                style={[
                  styles.progressBar, 
                  { 
                    width: `${Math.min(100, (selectedDayData.intake / selectedDayData.goal) * 100)}%`,
                    backgroundColor: selectedDayData.intake >= selectedDayData.goal 
                      ? theme['color-success-500'] 
                      : theme['color-primary-500']
                  }
                ]} 
              />
            </View>
          </Card>
        ) : (
          <Card style={styles.card}>
            <Text appearance='hint' style={styles.noDataText}>
              Select a date to view details
            </Text>
          </Card>
        )}
        
        {/* Legend */}
        <Card style={styles.card}>
          <Text category='h6' style={styles.cardTitle}>Legend</Text>
          <View style={styles.legendContainer}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: theme['color-success-500'] }]} />
              <Text>Goal met</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: theme['color-success-300'] }]} />
              <Text>75-99%</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: theme['color-warning-500'] }]} />
              <Text>50-74%</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: theme['color-warning-300'] }]} />
              <Text>1-49%</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: theme['color-basic-400'] }]} />
              <Text>No data</Text>
            </View>
          </View>
        </Card>
      </ScrollView>
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  title: {
    textAlign: 'center',
    marginVertical: 16,
  },
  card: {
    marginVertical: 8,
    borderRadius: 8,
    overflow: 'hidden',
  },
  cardTitle: {
    marginBottom: 8,
  },
  monthNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  calendarContainer: {
    alignItems: 'center',
    width: '100%',
  },
  calendar: {
    width: '100%',
    alignSelf: 'center',
  },
  dayCell: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 4,
  },
  dataDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 2,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 6,
    paddingHorizontal: 4,
  },
  dailyDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 12,
    paddingHorizontal: 8,
  },
  dailyDetailItem: {
    alignItems: 'center',
    flex: 1,
  },
  progressContainer: {
    height: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    marginTop: 12,
    marginHorizontal: 4,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
  },
  noDataText: {
    textAlign: 'center',
    marginVertical: 24,
  },
  legendContainer: {
    marginTop: 8,
    paddingHorizontal: 4,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 6,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
});